import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1793407278196 implements MigrationInterface {
    name = 'InitialSchema1793407278196'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "contratos"."tipo_contrato" AS ENUM('INDEFINIDO', 'PLAZO_FIJO')`);
        await queryRunner.query(`CREATE TABLE "contratos"."plantilla" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "codigo" character varying(30) NOT NULL, "nombre" character varying(150) NOT NULL, "tipo" "contratos"."tipo_contrato" NOT NULL, "activo" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f3ed10597eb995cbf343e381857" UNIQUE ("codigo"), CONSTRAINT "PK_7b519b4c74a24b94b7e11cbd705" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "contratos"."correlativo" ("tipo" character varying(10) NOT NULL, "anio" smallint NOT NULL, "ultimo" integer NOT NULL, CONSTRAINT "PK_29d6573b6de02c382e8a37b3e93" PRIMARY KEY ("tipo", "anio"))`);
        await queryRunner.query(`CREATE TABLE "contratos"."plantilla_version" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "plantilla_id" uuid NOT NULL, "version" integer NOT NULL, "contenido" text NOT NULL, "variables" jsonb NOT NULL, "activa" boolean NOT NULL, "creado_por" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_plantilla_version" UNIQUE ("plantilla_id", "version"), CONSTRAINT "PK_30fefb64b7fb87061ed0f636dd4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f3c66fd19f1ad2c8556ced4f80" ON "contratos"."plantilla_version" ("creado_por") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_plantilla_version_activa" ON "contratos"."plantilla_version" ("plantilla_id") WHERE "activa" = true`);
        await queryRunner.query(`CREATE TYPE "contratos"."estado_contrato" AS ENUM('VIGENTE', 'REEMPLAZADO')`);
        await queryRunner.query(`CREATE TABLE "contratos"."contrato" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "numero" character varying(20) NOT NULL, "funcionario_id" uuid NOT NULL, "plantilla_version_id" uuid NOT NULL, "version" integer NOT NULL, "estado" "contratos"."estado_contrato" NOT NULL, "datos" jsonb NOT NULL, "contenido_renderizado" text NOT NULL, "hash_sha256" character(64) NOT NULL, "generado_por" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d98e6aa1e7becdfa39e0f33c0ab" UNIQUE ("numero"), CONSTRAINT "uq_contrato_funcionario_version" UNIQUE ("funcionario_id", "version"), CONSTRAINT "PK_b82cfcedf2037eab18ca2714ef9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a5bf569ef700b40d44b2cfbe36" ON "contratos"."contrato" ("funcionario_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_037067b7f2abebac3081bf7459" ON "contratos"."contrato" ("generado_por") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_contrato_vigente" ON "contratos"."contrato" ("funcionario_id") WHERE "estado" = 'VIGENTE'`);
        await queryRunner.query(`CREATE TABLE "contratos"."contrato_pdf" ("contrato_id" uuid NOT NULL, "contenido" bytea NOT NULL, "tamano_bytes" integer NOT NULL, CONSTRAINT "PK_8d270adf2a9f2ba513985d446fe" PRIMARY KEY ("contrato_id"))`);
        await queryRunner.query(`ALTER TABLE "contratos"."plantilla_version" ADD CONSTRAINT "FK_e02aa88b7eef627ff9f150e5d28" FOREIGN KEY ("plantilla_id") REFERENCES "contratos"."plantilla"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contratos"."contrato" ADD CONSTRAINT "FK_33c37d106f8b9acbbea84d544b5" FOREIGN KEY ("plantilla_version_id") REFERENCES "contratos"."plantilla_version"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contratos"."contrato_pdf" ADD CONSTRAINT "FK_8d270adf2a9f2ba513985d446fe" FOREIGN KEY ("contrato_id") REFERENCES "contratos"."contrato"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contratos"."contrato_pdf" DROP CONSTRAINT "FK_8d270adf2a9f2ba513985d446fe"`);
        await queryRunner.query(`ALTER TABLE "contratos"."contrato" DROP CONSTRAINT "FK_33c37d106f8b9acbbea84d544b5"`);
        await queryRunner.query(`ALTER TABLE "contratos"."plantilla_version" DROP CONSTRAINT "FK_e02aa88b7eef627ff9f150e5d28"`);
        await queryRunner.query(`DROP TABLE "contratos"."contrato_pdf"`);
        await queryRunner.query(`DROP INDEX "contratos"."ux_contrato_vigente"`);
        await queryRunner.query(`DROP INDEX "contratos"."IDX_037067b7f2abebac3081bf7459"`);
        await queryRunner.query(`DROP INDEX "contratos"."IDX_a5bf569ef700b40d44b2cfbe36"`);
        await queryRunner.query(`DROP TABLE "contratos"."contrato"`);
        await queryRunner.query(`DROP TYPE "contratos"."estado_contrato"`);
        await queryRunner.query(`DROP INDEX "contratos"."ux_plantilla_version_activa"`);
        await queryRunner.query(`DROP INDEX "contratos"."IDX_f3c66fd19f1ad2c8556ced4f80"`);
        await queryRunner.query(`DROP TABLE "contratos"."plantilla_version"`);
        await queryRunner.query(`DROP TABLE "contratos"."correlativo"`);
        await queryRunner.query(`DROP TABLE "contratos"."plantilla"`);
        await queryRunner.query(`DROP TYPE "contratos"."tipo_contrato"`);
    }

}
