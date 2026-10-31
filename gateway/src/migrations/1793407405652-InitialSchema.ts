import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1793407405652 implements MigrationInterface {
    name = 'InitialSchema1793407405652'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "auditoria"."evento" ("id" BIGSERIAL NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "usuario_id" uuid, "rol" character varying(20), "metodo" character varying(7) NOT NULL, "ruta" character varying(300) NOT NULL, "servicio" character varying(30) NOT NULL, "recurso_id" character varying(64), "status_code" smallint NOT NULL, "ip" inet, "request_id" uuid NOT NULL, CONSTRAINT "PK_ceb2e9607555230aee6aff546b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_27241f02db77e909d823be9b0e" ON "auditoria"."evento" ("servicio", "fecha") `);
        await queryRunner.query(`CREATE INDEX "IDX_739c97c2269e365107ea1ad563" ON "auditoria"."evento" ("usuario_id", "fecha") `);
        await queryRunner.query(`CREATE INDEX "IDX_fa50bc698802d4bdde784b2916" ON "auditoria"."evento" ("fecha") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "auditoria"."IDX_fa50bc698802d4bdde784b2916"`);
        await queryRunner.query(`DROP INDEX "auditoria"."IDX_739c97c2269e365107ea1ad563"`);
        await queryRunner.query(`DROP INDEX "auditoria"."IDX_27241f02db77e909d823be9b0e"`);
        await queryRunner.query(`DROP TABLE "auditoria"."evento"`);
    }

}
