"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
    u4AdminToken
} = require("./_testCommon");

const Job = require("../models/job")
let jobId1;

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
beforeEach(async function () {
    const j1 = await Job.create(
        {
            title: 'testJob1',
            salary: 1000,
            equity: 0,
            companyHandle: 'c1'
        }
    )
    jobId1 = j1.id;

    await Job.create(
        {
            title: 'testJob2',
            salary: 2000,
            equity: 0.002,
            companyHandle: 'c2'
        }
    )
    await Job.create(
        {
            title: 'testJob3',
            salary: 3000,
            equity: null,
            companyHandle: 'c3'
        }
    )
})
afterEach(commonAfterEach);
afterAll(commonAfterAll);


/************************************** POST /jobs */
describe("POST /jobs", function () {
    const newJob = {
        title: "new-job",
        salary: 1000,
        equity: 0.005,
        companyHandle: "c1"
    };

    test("ok for admins", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u4AdminToken}`);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            job: {
                id: expect.any(Number),
                title: "new-job",
                salary: 1000,
                equity: "0.005",
                companyHandle: "c1"
            }
        });

        const jobRes = await db.query(
            `SELECT title, salary, equity
            FROM jobs
            WHERE title='new-job' AND salary=1000 AND equity=0.005`
        );
        expect(jobRes.rows[0]).toEqual({
            title: "new-job",
            salary: 1000,
            equity: "0.005",
        });
    });

    test("unauthorized for non-admin users", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
        expect(resp.body).toEqual({
            error: {
                message: "Unauthorized",
                status: 401
            }
        });
    });

    test("unauthorized for anon", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
        expect(resp.statusCode).toEqual(401);
        expect(resp.body).toEqual({
            error: {
                message: "Unauthorized",
                status: 401
            }
        });
    });

    test("bad request with missing data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                salary: 3000,
                equity: 0.001,
                companyHandle: "c1"
            })
            .set("authorization", `Bearer ${u4AdminToken}`);

        expect(resp.body).toEqual({
            error: {
                message: ["instance requires property \"title\""],
                status: 400
            }
        });
    });

    test("bad request with invalid data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: 3456,
                salary: "string",
                equity: 0.001,
                companyHandle: "c1"
            })
            .set("authorization", `Bearer ${u4AdminToken}`);
        expect(resp.body).toEqual({
            error: {
                message: ["instance.title is not of a type(s) string",
                    "instance.salary is not of a type(s) integer"],
                status: 400
            }
        })
    });
});
