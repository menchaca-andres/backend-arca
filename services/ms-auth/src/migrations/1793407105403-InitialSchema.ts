import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1793407105403 implements MigrationInterface {
    name = 'InitialSchema1793407105403'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "auth"."rol_usuario" AS ENUM('ADMIN', 'RRHH', 'DIRECCION', 'FUNCIONARIO')`);
        await queryRunner.query(`CREATE TABLE "auth"."usuario" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(150) NOT NULL, "password_hash" character varying(100) NOT NULL, "rol" "auth"."rol_usuario" NOT NULL, "funcionario_id" uuid, "activo" boolean NOT NULL DEFAULT true, "intentos_fallidos" smallint NOT NULL DEFAULT '0', "bloqueado_hasta" TIMESTAMP WITH TIME ZONE, "ultimo_acceso" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2863682842e688ca198eb25c124" UNIQUE ("email"), CONSTRAINT "UQ_1c3666748085fe9193995cea3d7" UNIQUE ("funcionario_id"), CONSTRAINT "ck_usuario_funcionario_vinculado" CHECK ("rol" <> 'FUNCIONARIO' OR "funcionario_id" IS NOT NULL), CONSTRAINT "PK_a56c58e5cabaa04fb2c98d2d7e2" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "auth"."usuario"`);
        await queryRunner.query(`DROP TYPE "auth"."rol_usuario"`);
    }

}
