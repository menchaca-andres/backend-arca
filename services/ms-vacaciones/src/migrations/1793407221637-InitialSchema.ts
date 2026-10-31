import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1793407221637 implements MigrationInterface {
    name = 'InitialSchema1793407221637'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "vacaciones"."estado_solicitud" AS ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA')`);
        await queryRunner.query(`CREATE TABLE "vacaciones"."solicitud_vacacion" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "funcionario_id" uuid NOT NULL, "funcionario_nombre" character varying(200) NOT NULL, "fecha_inicio" date NOT NULL, "fecha_fin" date NOT NULL, "dias_habiles" smallint NOT NULL, "estado" "vacaciones"."estado_solicitud" NOT NULL DEFAULT 'PENDIENTE', "motivo_rechazo" character varying(300), "registrado_por" uuid NOT NULL, "resuelto_por" uuid, "fecha_resolucion" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_solicitud_resolucion" CHECK ("estado" = 'PENDIENTE' OR ("resuelto_por" IS NOT NULL AND "fecha_resolucion" IS NOT NULL)), CONSTRAINT "ck_solicitud_motivo_rechazo" CHECK ("estado" <> 'RECHAZADA' OR "motivo_rechazo" IS NOT NULL), CONSTRAINT "ck_solicitud_dias_habiles" CHECK ("dias_habiles" > 0), CONSTRAINT "ck_solicitud_fechas" CHECK ("fecha_fin" >= "fecha_inicio"), CONSTRAINT "PK_299ce04bf00775ab6bbdf5dad56" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1eb5e49719c25f3f251c97bbdc" ON "vacaciones"."solicitud_vacacion" ("funcionario_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e5c636ca4032691852026dc0f3" ON "vacaciones"."solicitud_vacacion" ("registrado_por") `);
        await queryRunner.query(`CREATE INDEX "IDX_7388eb7477c533052d2980648f" ON "vacaciones"."solicitud_vacacion" ("resuelto_por") `);
        await queryRunner.query(`CREATE INDEX "IDX_cbbf8225803cb3516e7a9fe229" ON "vacaciones"."solicitud_vacacion" ("estado", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_8fc438ae667d34330694324178" ON "vacaciones"."solicitud_vacacion" ("funcionario_id", "estado") `);
        await queryRunner.query(`CREATE TABLE "vacaciones"."feriado" ("fecha" date NOT NULL, "descripcion" character varying(100) NOT NULL, CONSTRAINT "PK_42bca97344012197c2eb1d7e556" PRIMARY KEY ("fecha"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "vacaciones"."feriado"`);
        await queryRunner.query(`DROP INDEX "vacaciones"."IDX_8fc438ae667d34330694324178"`);
        await queryRunner.query(`DROP INDEX "vacaciones"."IDX_cbbf8225803cb3516e7a9fe229"`);
        await queryRunner.query(`DROP INDEX "vacaciones"."IDX_7388eb7477c533052d2980648f"`);
        await queryRunner.query(`DROP INDEX "vacaciones"."IDX_e5c636ca4032691852026dc0f3"`);
        await queryRunner.query(`DROP INDEX "vacaciones"."IDX_1eb5e49719c25f3f251c97bbdc"`);
        await queryRunner.query(`DROP TABLE "vacaciones"."solicitud_vacacion"`);
        await queryRunner.query(`DROP TYPE "vacaciones"."estado_solicitud"`);
    }

}
