"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
} = require("./_testCommon");

let testJobId1;
let testJobId2;
let testJobId3;

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
beforeEach(async function () {
    const result = await db.query(`
                            INSERT INTO jobs(title, 
                                            salary, 
                                            equity, 
                                            company_handle)
                            VALUES ($1, $2, $3, $4)
                            RETURNING id, title, salary, equity, company_handle as "companyHandle"`,
        ['testJob1', 1000, 0.001, 'c1']);
    testJobId1 = result.rows[0].id;
    const result2 = await db.query(`
                            INSERT INTO jobs(title, 
                                            salary, 
                                            equity, 
                                            company_handle)
                                            VALUES ($1, $2, $3, $4)
                            RETURNING id, title, salary, equity, company_handle as "companyHandle"`,
        ['testJob2', 2000, 0, 'c2']);
    testJobId2 = result2.rows[0].id;
    const result3 = await db.query(`
                            INSERT INTO jobs(title, 
                                            salary, 
                                            equity, 
                                            company_handle)
                                            VALUES ($1, $2, $3, $4)
                            RETURNING id, title, salary, equity, company_handle as "companyHandle"`,
        ['testJob3', 3000, null, 'c3']);
    testJobId3 = result3.rows[0].id;
});

afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
    const newJob = {
        title: "new job",
        salary: 3000,
        equity: 0.003,
        companyHandle: "c3"
    };

    test("works", async function () {
        const job = await Job.create(newJob);
        // console.log(job, "job in test")
        expect(job).toEqual({
            id: expect.any(Number),
            title: "new job",
            salary: 3000,
            equity: "0.003",
            companyHandle: "c3"
        });

        const result = await db.query(
            `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE title='new job' AND company_handle='c3'`);
        expect(result.rows).toEqual([
            {
                title: "new job",
                salary: 3000,
                equity: "0.003",
                company_handle: "c3"
            },
        ]);
    });
});

/************************************** findAll */

describe("findAll", function () {
    test("works: no filter", async function () {

        const jobs = await Job.findAll();

        // console.log(jobs, "jobs in test")
        expect(jobs).toEqual([
            {
                id: testJobId1,
                title: "testJob1",
                salary: 1000,
                equity: "0.001",
                companyHandle: "c1"
            },
            {
                id: testJobId2,
                title: "testJob2",
                salary: 2000,
                equity: "0",
                companyHandle: "c2"
            },
            {
                id: testJobId3,
                title: "testJob3",
                salary: 3000,
                equity: null,
                companyHandle: "c3"
            }
        ]);
    });
});

/************************************** findAll with filter search*/
describe("test helper function _makeWhereClause", function () {

    test("pass in three valid filters", function () {
        const result = Job._makeWhereClause({
            title: "test",
            minSalary: 1000,
            hasEquity: true

        });
        expect(result).toEqual({
            whereClause: "title ILIKE $1 AND salary >= $2 AND CAST(equity AS FLOAT) > 0",
            values: ["%test%", 1000]
        });
    });

    test("pass in hasEquity as false", function () {
        const result = Job._makeWhereClause({
            title: "test",
            minSalary: 1000,
            hasEquity: false

        });
        expect(result).toEqual({
            whereClause: "title ILIKE $1 AND salary >= $2",
            values: ["%test%", 1000]
        });
    });
});

describe("filterSearch", function () {
    test("works with one filter", async function () {
        const jobs = await Job.filterSearch({
            title: "test"
        });
        expect(jobs).toEqual([
            {
                id: testJobId1,
                title: "testJob1",
                salary: 1000,
                equity: "0.001",
                companyHandle: "c1"
            },
            {
                id: testJobId2,
                title: "testJob2",
                salary: 2000,
                equity: "0",
                companyHandle: "c2"
            },
            {
                id: testJobId3,
                title: "testJob3",
                salary: 3000,
                equity: null,
                companyHandle: "c3"
            }
        ]);
    });
    test("works with two filters", async function () {
        const jobs = await Job.filterSearch({
            minSalary: 1500,
            hasEquity: false
        });
        expect(jobs).toEqual([
            {
                id: testJobId2,
                title: "testJob2",
                salary: 2000,
                equity: "0",
                companyHandle: "c2"
            },
            {
                id: testJobId3,
                title: "testJob3",
                salary: 3000,
                equity: null,
                companyHandle: "c3"
            }
        ]);
    });

    test("works with three filters", async function () {
        const jobs = await Job.filterSearch({
            title: "test",
            minSalary: 800,
            hasEquity: true
        });
        expect(jobs).toEqual([
            {
                id: testJobId1,
                title: "testJob1",
                salary: 1000,
                equity: "0.001",
                companyHandle: "c1"
            }
        ]);
    });
});


/************************************** get */

describe("get", function () {
    test("works", async function () {
        const job = await Job.get(testJobId1);
        expect(job).toEqual({
            id: testJobId1,
            title: "testJob1",
            salary: 1000,
            equity: "0.001",
            companyHandle: "c1"
        });
    });

    test("not found if no such company", async function () {
        try {
            await Job.get(999999);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/************************************** update */

describe("update", function () {
    const updateData = {
        title: "new-testJob1",
        salary: 10000,
        equity: 0.0001
    };

    test("works", async function () {
        const job = await Job.update(testJobId1, updateData);
        expect(job).toEqual({
            id: testJobId1,
            title: "new-testJob1",
            salary: 10000,
            equity: "0.0001",
            companyHandle: 'c1'
        });

        const result = await db.query(
            `SELECT title, salary, equity
           FROM jobs
           WHERE id=$1`, [testJobId1]);
        expect(result.rows).toEqual([{
            title: "new-testJob1",
            salary: 10000,
            equity: "0.0001"
        }]);
    });

    test("works: null fields", async function () {
        const updateDataSetNulls = {
            title: "new-testJob1",
            salary: null,
            equity: null
        };

        const job = await Job.update(testJobId1, updateDataSetNulls);
        expect(job).toEqual({
            id: testJobId1,
            title: "new-testJob1",
            salary: null,
            equity: null,
            companyHandle: 'c1'
        });

        const result = await db.query(
            `SELECT title, salary, equity
           FROM jobs
           WHERE id=$1`, [testJobId1]);
        expect(result.rows).toEqual([{
            title: "new-testJob1",
            salary: null,
            equity: null
        }]);
    });

    test("not found if no such job", async function () {
        try {
            await Job.update(999999, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
            await Job.update(`${testJobId1}`, {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/************************************** remove */

describe("remove", function () {
    test("works", async function () {
        await Job.remove(`${testJobId1}`);
        const res = await db.query(
            "SELECT title FROM jobs WHERE id=$1", [testJobId1]);
        expect(res.rows.length).toEqual(0);
    });

    test("not found if no such job", async function () {
        try {
            await Job.remove(999999);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});
