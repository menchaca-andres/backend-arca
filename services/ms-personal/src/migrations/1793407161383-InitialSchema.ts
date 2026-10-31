import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1793407161383 implements MigrationInterface {
    name = 'InitialSchema1793407161383'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "personal"."estado_funcionario" AS ENUM('EN_PRUEBA', 'RATIFICADO', 'BAJA')`);
        await queryRunner.query(`CREATE TYPE "personal"."motivo_baja" AS ENUM('RENUNCIA', 'DESPIDO', 'FIN_CONTRATO', 'NO_RATIFICADO', 'OTRO')`);
        await queryRunner.query(`CREATE TABLE "personal"."funcionario" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "ci" character varying(15) NOT NULL, "ci_expedido" character varying(2) NOT NULL, "nombres" character varying(100) NOT NULL, "apellidos" character varying(100) NOT NULL, "fecha_nacimiento" date NOT NULL, "sexo" character(1) NOT NULL, "correo" character varying(150), "telefono" character varying(20), "direccion" character varying(200), "fecha_ingreso" date NOT NULL, "dias_prueba" smallint NOT NULL DEFAULT '90', "estado" "personal"."estado_funcionario" NOT NULL DEFAULT 'EN_PRUEBA', "fecha_ratificacion" date, "fecha_baja" date, "motivo_baja" "personal"."motivo_baja", "detalle_baja" character varying(300), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_b5eb71d0b12c65339ae010dbc82" UNIQUE ("ci"), CONSTRAINT "ck_funcionario_detalle_baja" CHECK ("motivo_baja" <> 'OTRO' OR "detalle_baja" IS NOT NULL), CONSTRAINT "ck_funcionario_fecha_baja" CHECK ("fecha_baja" IS NULL OR "fecha_baja" >= "fecha_ingreso"), CONSTRAINT "ck_funcionario_baja" CHECK ("estado" <> 'BAJA' OR ("fecha_baja" IS NOT NULL AND "motivo_baja" IS NOT NULL)), CONSTRAINT "ck_funcionario_ratificado" CHECK ("estado" <> 'RATIFICADO' OR "fecha_ratificacion" IS NOT NULL), CONSTRAINT "ck_funcionario_dias_prueba" CHECK ("dias_prueba" BETWEEN 1 AND 90), CONSTRAINT "ck_funcionario_sexo" CHECK ("sexo" IN ('M', 'F')), CONSTRAINT "ck_funcionario_ci_expedido" CHECK ("ci_expedido" IN ('LP', 'CB', 'SC', 'OR', 'PT', 'CH', 'TJ', 'BE', 'PD')), CONSTRAINT "PK_2c5d0c275b4f652fd5cb381655f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "personal"."area" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "codigo" character varying(20) NOT NULL, "nombre" character varying(100) NOT NULL, "activo" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2080e14224a7af47f76b838f236" UNIQUE ("codigo"), CONSTRAINT "UQ_2725fe3ddbc933b32810f6b3ec7" UNIQUE ("nombre"), CONSTRAINT "PK_39d5e4de490139d6535d75f42ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "personal"."cargo" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "area_id" uuid NOT NULL, "nombre" character varying(100) NOT NULL, "salario_min" numeric(12,2) NOT NULL, "salario_max" numeric(12,2) NOT NULL, "activo" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_cargo_area_nombre" UNIQUE ("area_id", "nombre"), CONSTRAINT "ck_cargo_banda" CHECK ("salario_min" <= "salario_max"), CONSTRAINT "ck_cargo_salario_min" CHECK ("salario_min" > 0), CONSTRAINT "PK_1af8b2a790f35aedbe7e3da4199" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "personal"."motivo_asignacion" AS ENUM('INGRESO', 'ASCENSO', 'TRASLADO', 'INCREMENTO', 'CORRECCION')`);
        await queryRunner.query(`CREATE TABLE "personal"."asignacion_laboral" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "funcionario_id" uuid NOT NULL, "cargo_id" uuid NOT NULL, "remuneracion" numeric(12,2) NOT NULL, "vigente_desde" date NOT NULL, "vigente_hasta" date, "motivo" "personal"."motivo_asignacion" NOT NULL, "registrado_por" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_asignacion_vigencia" CHECK ("vigente_hasta" IS NULL OR "vigente_hasta" >= "vigente_desde"), CONSTRAINT "ck_asignacion_remuneracion" CHECK ("remuneracion" > 0), CONSTRAINT "PK_04130fd1107bdae9d9dbf8445e4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b33d6740ddfe1df568bf8dd0cd" ON "personal"."asignacion_laboral" ("registrado_por") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "ux_asignacion_vigente" ON "personal"."asignacion_laboral" ("funcionario_id") WHERE "vigente_hasta" IS NULL`);
        await queryRunner.query(`ALTER TABLE "personal"."cargo" ADD CONSTRAINT "FK_da0d0c47d2e9de3be33911384d7" FOREIGN KEY ("area_id") REFERENCES "personal"."area"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "personal"."asignacion_laboral" ADD CONSTRAINT "FK_b717759dfe7f7ce2253d0a45418" FOREIGN KEY ("funcionario_id") REFERENCES "personal"."funcionario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "personal"."asignacion_laboral" ADD CONSTRAINT "FK_0a2c60e018e18c53b9ffb4b0333" FOREIGN KEY ("cargo_id") REFERENCES "personal"."cargo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "personal"."asignacion_laboral" DROP CONSTRAINT "FK_0a2c60e018e18c53b9ffb4b0333"`);
        await queryRunner.query(`ALTER TABLE "personal"."asignacion_laboral" DROP CONSTRAINT "FK_b717759dfe7f7ce2253d0a45418"`);
        await queryRunner.query(`ALTER TABLE "personal"."cargo" DROP CONSTRAINT "FK_da0d0c47d2e9de3be33911384d7"`);
        await queryRunner.query(`DROP INDEX "personal"."ux_asignacion_vigente"`);
        await queryRunner.query(`DROP INDEX "personal"."IDX_b33d6740ddfe1df568bf8dd0cd"`);
        await queryRunner.query(`DROP TABLE "personal"."asignacion_laboral"`);
        await queryRunner.query(`DROP TYPE "personal"."motivo_asignacion"`);
        await queryRunner.query(`DROP TABLE "personal"."cargo"`);
        await queryRunner.query(`DROP TABLE "personal"."area"`);
        await queryRunner.query(`DROP TABLE "personal"."funcionario"`);
        await queryRunner.query(`DROP TYPE "personal"."motivo_baja"`);
        await queryRunner.query(`DROP TYPE "personal"."estado_funcionario"`);
    }

}
