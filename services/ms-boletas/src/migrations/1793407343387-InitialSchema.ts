import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1793407343387 implements MigrationInterface {
    name = 'InitialSchema1793407343387'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "boletas"."tipo_concepto" AS ENUM('HABER', 'DESCUENTO')`);
        await queryRunner.query(`CREATE TYPE "boletas"."forma_calculo" AS ENUM('SISTEMA', 'MONTO_FIJO', 'PORCENTAJE')`);
        await queryRunner.query(`CREATE TYPE "boletas"."base_calculo" AS ENUM('HABER_BASICO', 'TOTAL_GANADO')`);
        await queryRunner.query(`CREATE TABLE "boletas"."concepto" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "codigo" character varying(20) NOT NULL, "nombre" character varying(100) NOT NULL, "tipo" "boletas"."tipo_concepto" NOT NULL, "forma_calculo" "boletas"."forma_calculo" NOT NULL, "valor" numeric(12,4), "base" "boletas"."base_calculo", "automatico" boolean NOT NULL, "es_sistema" boolean NOT NULL, "orden" smallint NOT NULL, "activo" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_50bc9e97df1febd9bee3085a5ed" UNIQUE ("codigo"), CONSTRAINT "ck_concepto_sistema" CHECK ("forma_calculo" <> 'SISTEMA' OR ("valor" IS NULL AND "base" IS NULL)), CONSTRAINT "ck_concepto_monto_fijo" CHECK ("forma_calculo" <> 'MONTO_FIJO' OR "valor" > 0), CONSTRAINT "ck_concepto_porcentaje" CHECK ("forma_calculo" <> 'PORCENTAJE' OR ("valor" BETWEEN 0 AND 100 AND "base" IS NOT NULL)), CONSTRAINT "PK_58128f6ae7c9aba37e8b54777e3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "boletas"."novedad" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "anio" smallint NOT NULL, "mes" smallint NOT NULL, "funcionario_id" uuid NOT NULL, "concepto_id" uuid NOT NULL, "monto" numeric(12,2) NOT NULL, "descripcion" character varying(200), "registrado_por" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_novedad" UNIQUE ("anio", "mes", "funcionario_id", "concepto_id"), CONSTRAINT "ck_novedad_monto" CHECK ("monto" > 0), CONSTRAINT "ck_novedad_mes" CHECK ("mes" BETWEEN 1 AND 12), CONSTRAINT "PK_343018332066d73858ac081f1d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a3d27d84a8e398c54ee14d1518" ON "boletas"."novedad" ("funcionario_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d6283ad6934be78103f07addbe" ON "boletas"."novedad" ("registrado_por") `);
        await queryRunner.query(`CREATE TYPE "boletas"."estado_periodo" AS ENUM('BORRADOR', 'EMITIDO')`);
        await queryRunner.query(`CREATE TABLE "boletas"."periodo" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "anio" smallint NOT NULL, "mes" smallint NOT NULL, "estado" "boletas"."estado_periodo" NOT NULL DEFAULT 'BORRADOR', "fecha_calculo" TIMESTAMP WITH TIME ZONE, "fecha_emision" TIMESTAMP WITH TIME ZONE, "emitido_por" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_periodo_anio_mes" UNIQUE ("anio", "mes"), CONSTRAINT "ck_periodo_mes" CHECK ("mes" BETWEEN 1 AND 12), CONSTRAINT "PK_7a8fb04e141b549da1311059257" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3718de682d6d278cce2aa9b93a" ON "boletas"."periodo" ("emitido_por") `);
        await queryRunner.query(`CREATE TABLE "boletas"."correlativo" ("tipo" character varying(10) NOT NULL, "anio" smallint NOT NULL, "ultimo" integer NOT NULL, CONSTRAINT "PK_29d6573b6de02c382e8a37b3e93" PRIMARY KEY ("tipo", "anio"))`);
        await queryRunner.query(`CREATE TYPE "boletas"."estado_boleta" AS ENUM('BORRADOR', 'EMITIDA', 'RECTIFICADA')`);
        await queryRunner.query(`CREATE TABLE "boletas"."boleta" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "periodo_id" uuid NOT NULL, "funcionario_id" uuid NOT NULL, "numero" character varying(20), "version" smallint NOT NULL DEFAULT '1', "estado" "boletas"."estado_boleta" NOT NULL DEFAULT 'BORRADOR', "boleta_original_id" uuid, "motivo_rectificacion" character varying(300), "datos_funcionario" jsonb NOT NULL, "dias_trabajados" smallint NOT NULL, "total_ganado" numeric(12,2) NOT NULL, "total_descuentos" numeric(12,2) NOT NULL, "liquido_pagable" numeric(12,2) NOT NULL, "tiene_alerta" boolean NOT NULL, "hash_sha256" character(64), "emitida_en" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_579059d7932fa8ed98f4330143d" UNIQUE ("numero"), CONSTRAINT "ck_boleta_dias_trabajados" CHECK ("dias_trabajados" BETWEEN 0 AND 30), CONSTRAINT "ck_boleta_rectificacion" CHECK ("version" = 1 OR ("boleta_original_id" IS NOT NULL AND "motivo_rectificacion" IS NOT NULL)), CONSTRAINT "ck_boleta_liquido" CHECK ("estado" = 'BORRADOR' OR "liquido_pagable" >= 0), CONSTRAINT "ck_boleta_emision" CHECK ("estado" = 'BORRADOR' OR ("numero" IS NOT NULL AND "hash_sha256" IS NOT NULL AND "emitida_en" IS NOT NULL)), CONSTRAINT "PK_0071fe5f42a3aadd71c7929b742" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5eb3ef0fa7cb9248830d27bdec" ON "boletas"."boleta" ("funcionario_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_boleta_vigente" ON "boletas"."boleta" ("periodo_id", "funcionario_id") WHERE "estado" <> 'RECTIFICADA'`);
        await queryRunner.query(`CREATE TABLE "boletas"."boleta_detalle" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "boleta_id" uuid NOT NULL, "concepto_id" uuid NOT NULL, "concepto_codigo" character varying(20) NOT NULL, "concepto_nombre" character varying(100) NOT NULL, "tipo" "boletas"."tipo_concepto" NOT NULL, "base_monto" numeric(12,2), "porcentaje" numeric(7,4), "monto" numeric(12,2) NOT NULL, "orden" smallint NOT NULL, CONSTRAINT "PK_55df9503df8aac6a8547391e578" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "boletas"."boleta_pdf" ("boleta_id" uuid NOT NULL, "contenido" bytea NOT NULL, "tamano_bytes" integer NOT NULL, CONSTRAINT "PK_1a0d6734ae64c8a3fb0fb7e1134" PRIMARY KEY ("boleta_id"))`);
        await queryRunner.query(`ALTER TABLE "boletas"."novedad" ADD CONSTRAINT "FK_7eb866d696baafefd54926190d3" FOREIGN KEY ("concepto_id") REFERENCES "boletas"."concepto"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "boletas"."boleta" ADD CONSTRAINT "FK_6ac8c74fbe6ef75ab858761b8d7" FOREIGN KEY ("periodo_id") REFERENCES "boletas"."periodo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "boletas"."boleta" ADD CONSTRAINT "FK_ad22405619373ac31d09240f7ff" FOREIGN KEY ("boleta_original_id") REFERENCES "boletas"."boleta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "boletas"."boleta_detalle" ADD CONSTRAINT "FK_a8638e3b2cd9700b0fc5b813968" FOREIGN KEY ("boleta_id") REFERENCES "boletas"."boleta"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "boletas"."boleta_detalle" ADD CONSTRAINT "FK_bece64360c457a9f34ffdc8703e" FOREIGN KEY ("concepto_id") REFERENCES "boletas"."concepto"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "boletas"."boleta_pdf" ADD CONSTRAINT "FK_1a0d6734ae64c8a3fb0fb7e1134" FOREIGN KEY ("boleta_id") REFERENCES "boletas"."boleta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "boletas"."boleta_pdf" DROP CONSTRAINT "FK_1a0d6734ae64c8a3fb0fb7e1134"`);
        await queryRunner.query(`ALTER TABLE "boletas"."boleta_detalle" DROP CONSTRAINT "FK_bece64360c457a9f34ffdc8703e"`);
        await queryRunner.query(`ALTER TABLE "boletas"."boleta_detalle" DROP CONSTRAINT "FK_a8638e3b2cd9700b0fc5b813968"`);
        await queryRunner.query(`ALTER TABLE "boletas"."boleta" DROP CONSTRAINT "FK_ad22405619373ac31d09240f7ff"`);
        await queryRunner.query(`ALTER TABLE "boletas"."boleta" DROP CONSTRAINT "FK_6ac8c74fbe6ef75ab858761b8d7"`);
        await queryRunner.query(`ALTER TABLE "boletas"."novedad" DROP CONSTRAINT "FK_7eb866d696baafefd54926190d3"`);
        await queryRunner.query(`DROP TABLE "boletas"."boleta_pdf"`);
        await queryRunner.query(`DROP TABLE "boletas"."boleta_detalle"`);
        await queryRunner.query(`DROP INDEX "boletas"."ux_boleta_vigente"`);
        await queryRunner.query(`DROP INDEX "boletas"."IDX_5eb3ef0fa7cb9248830d27bdec"`);
        await queryRunner.query(`DROP TABLE "boletas"."boleta"`);
        await queryRunner.query(`DROP TYPE "boletas"."estado_boleta"`);
        await queryRunner.query(`DROP TABLE "boletas"."correlativo"`);
        await queryRunner.query(`DROP INDEX "boletas"."IDX_3718de682d6d278cce2aa9b93a"`);
        await queryRunner.query(`DROP TABLE "boletas"."periodo"`);
        await queryRunner.query(`DROP TYPE "boletas"."estado_periodo"`);
        await queryRunner.query(`DROP INDEX "boletas"."IDX_d6283ad6934be78103f07addbe"`);
        await queryRunner.query(`DROP INDEX "boletas"."IDX_a3d27d84a8e398c54ee14d1518"`);
        await queryRunner.query(`DROP TABLE "boletas"."novedad"`);
        await queryRunner.query(`DROP TABLE "boletas"."concepto"`);
        await queryRunner.query(`DROP TYPE "boletas"."base_calculo"`);
        await queryRunner.query(`DROP TYPE "boletas"."tipo_concepto"`);
        await queryRunner.query(`DROP TYPE "boletas"."forma_calculo"`);
    }

}
