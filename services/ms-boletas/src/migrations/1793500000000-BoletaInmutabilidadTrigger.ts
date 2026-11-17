import { MigrationInterface, QueryRunner } from 'typeorm';

export class BoletaInmutabilidadTrigger1793500000000 implements MigrationInterface {
  name = 'BoletaInmutabilidadTrigger1793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Función trigger de inmutabilidad (HU-22 CA-04)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "boletas".trg_proteger_boleta_inmutable()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Bloqueo de DELETE sobre boletas EMITIDAS o RECTIFICADAS
        IF TG_OP = 'DELETE' THEN
          IF OLD.estado = 'EMITIDA' OR OLD.estado = 'RECTIFICADA' THEN
            RAISE EXCEPTION 'No se puede eliminar una boleta emitida o rectificada por inmutabilidad legal (CA-04)';
          END IF;
          RETURN OLD;
        END IF;

        -- Bloqueo de UPDATE sobre boletas EMITIDAS o RECTIFICADAS
        IF TG_OP = 'UPDATE' THEN
          IF OLD.estado = 'EMITIDA' THEN
            -- La única transición permitida es hacia RECTIFICADA
            IF NEW.estado = 'RECTIFICADA' THEN
              -- Garantizar que no se alteren montos, snapshot ni número correlativo original
              IF NEW.numero <> OLD.numero OR NEW.hash_sha256 <> OLD.hash_sha256 OR NEW.liquido_pagable <> OLD.liquido_pagable THEN
                RAISE EXCEPTION 'No se pueden alterar los valores de una boleta al rectificarla (CA-04)';
              END IF;
              RETURN NEW;
            ELSE
              RAISE EXCEPTION 'Una boleta emitida es inmutable y no puede ser modificada (CA-04)';
            END IF;
          END IF;

          IF OLD.estado = 'RECTIFICADA' THEN
            RAISE EXCEPTION 'Una boleta rectificada es inmutable y no admite modificaciones posteriores (CA-04)';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Disparador sobre la tabla boleta
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_boleta_inmutabilidad ON "boletas"."boleta";
      CREATE TRIGGER trg_boleta_inmutabilidad
      BEFORE UPDATE OR DELETE ON "boletas"."boleta"
      FOR EACH ROW
      EXECUTE FUNCTION "boletas".trg_proteger_boleta_inmutable();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_boleta_inmutabilidad ON "boletas"."boleta"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "boletas".trg_proteger_boleta_inmutable()`);
  }
}
