import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTournamentStages20261028100000 implements MigrationInterface {
  name = 'AddTournamentStages20261028100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tournaments"
      ADD COLUMN "qualifiersPerGroup" integer NOT NULL DEFAULT 2,
      ADD COLUMN "bronzeMatchEnabled" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "matches"
      ADD COLUMN "stage" character varying(20) NOT NULL DEFAULT 'GROUP'
    `);
    await queryRunner.query(`
      UPDATE "matches"
      SET "stage" = 'KNOCKOUT'
      FROM "tournaments"
      WHERE "tournaments"."id" = "matches"."tournamentId"
        AND "tournaments"."bracket_Type" = 'SINGLE_ELIMINATION'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "matches" DROP COLUMN "stage"');
    await queryRunner.query('ALTER TABLE "tournaments" DROP COLUMN "bronzeMatchEnabled"');
    await queryRunner.query('ALTER TABLE "tournaments" DROP COLUMN "qualifiersPerGroup"');
  }
}
