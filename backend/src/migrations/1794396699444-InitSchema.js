module.exports = class InitSchema1794396699444 {
    name = 'InitSchema1794396699444'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "cities" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "region" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a0ae8d83b7d32359578c486e7f6" UNIQUE ("name"), CONSTRAINT "PK_4762ffb6e5d198cfec5606bc11e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sites" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "address" text, "city_id" integer, "status" character varying(50) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_3dd2860313a7236a1c153e209e" CHECK ("status" IN ('active', 'inactive', 'under_construction', 'decommissioned')), CONSTRAINT "PK_4f5eccb1dfde10c9170502595a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_803d5f9c03629f6edd5e7bac11" ON "sites"  ("city_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e3f7b7a2d406b8f43b255330b1" ON "sites"  ("status") `);
        await queryRunner.query(`CREATE TABLE "equipment" ("id" SERIAL NOT NULL, "site_id" integer NOT NULL, "type" character varying(30) NOT NULL, "model" character varying(100) NOT NULL, "serial_number" character varying(100) NOT NULL, "status" character varying(30) NOT NULL DEFAULT 'working', "installed_at" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_738b192e1f452ed9a93231888f0" UNIQUE ("serial_number"), CONSTRAINT "CHK_b6fe70cd130d6232a4582a5bda" CHECK ("type" IN ('antenna', 'router', 'switch', 'power_unit', 'battery', 'other')), CONSTRAINT "CHK_b7f6f317a8616ce0be4e77018c" CHECK ("status" IN ('working', 'faulty', 'decommissioned')), CONSTRAINT "PK_0722e1b9d6eb19f5874c1678740" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8790d3264c2a836541ca100c78" ON "equipment"  ("site_id") `);
        await queryRunner.query(`CREATE TABLE "inspections" ("id" SERIAL NOT NULL, "site_id" integer NOT NULL, "inspector" character varying(100) NOT NULL, "inspected_at" date NOT NULL, "result" character varying(30) NOT NULL, "notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_a794e57789a09d08e12c282d84" CHECK ("result" IN ('passed', 'needs_attention', 'failed')), CONSTRAINT "PK_a484980015782324454d8c88abe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9492c1a537456b45cd44202a98" ON "inspections"  ("site_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3c6cb23344283e2c9559b9b359" ON "inspections"  ("inspected_at") `);
        await queryRunner.query(`ALTER TABLE "sites" ADD CONSTRAINT "FK_803d5f9c03629f6edd5e7bac119" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "equipment" ADD CONSTRAINT "FK_8790d3264c2a836541ca100c78f" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inspections" ADD CONSTRAINT "FK_9492c1a537456b45cd44202a983" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "inspections" DROP CONSTRAINT "FK_9492c1a537456b45cd44202a983"`);
        await queryRunner.query(`ALTER TABLE "equipment" DROP CONSTRAINT "FK_8790d3264c2a836541ca100c78f"`);
        await queryRunner.query(`ALTER TABLE "sites" DROP CONSTRAINT "FK_803d5f9c03629f6edd5e7bac119"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c6cb23344283e2c9559b9b359"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9492c1a537456b45cd44202a98"`);
        await queryRunner.query(`DROP TABLE "inspections"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8790d3264c2a836541ca100c78"`);
        await queryRunner.query(`DROP TABLE "equipment"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3f7b7a2d406b8f43b255330b1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_803d5f9c03629f6edd5e7bac11"`);
        await queryRunner.query(`DROP TABLE "sites"`);
        await queryRunner.query(`DROP TABLE "cities"`);
    }
}
