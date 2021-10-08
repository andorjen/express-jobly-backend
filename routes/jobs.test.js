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

/************************************** GET /jobs without filter */

describe("GET /jobs", function () {
    test("ok for anon", async function () {
        const resp = await request(app).get("/jobs");
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: jobId1,
                    title: 'testJob1',
                    salary: 1000,
                    equity: "0",
                    companyHandle: 'c1'
                },
                {
                    id: expect.any(Number),
                    title: 'testJob2',
                    salary: 2000,
                    equity: "0.002",
                    companyHandle: 'c2'
                },
                {
                    id: expect.any(Number),
                    title: 'testJob3',
                    salary: 3000,
                    equity: null,
                    companyHandle: 'c3'
                }

            ]
        });
    });

    test("fails: test next() handler", async function () {
        // there's no normal failure event which will cause this route to fail ---
        // thus making it hard to test that the error-handler works with it. This
        // should cause an error, all right :)
        await db.query("DROP TABLE jobs CASCADE");
        const resp = await request(app)
            .get("/jobs")
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(500);
    });
});

/*********************************** GET /jobs with filters  */
describe("GET /jobs with filters", function () {

    test("ok for anon with one filters", async function () {
        const resp = await request(app).get("/jobs?title=job2");
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: expect.any(Number),
                    title: 'testJob2',
                    salary: 2000,
                    equity: "0.002",
                    companyHandle: 'c2'
                }
            ]
        });
    });

    test("ok for anon with only hasEquity false filter", async function () {
        const resp = await request(app).get("/jobs?hasEquity=false");
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: jobId1,
                    title: 'testJob1',
                    salary: 1000,
                    equity: "0",
                    companyHandle: 'c1'
                },
                {
                    id: expect.any(Number),
                    title: 'testJob2',
                    salary: 2000,
                    equity: "0.002",
                    companyHandle: 'c2'
                },
                {
                    id: expect.any(Number),
                    title: 'testJob3',
                    salary: 3000,
                    equity: null,
                    companyHandle: 'c3'
                }
            ]
        });
    });

    test("okay for anon with three filters", async function () {
        const resp = await request(app).get("/jobs?hasEquity=true&minSalary=1500&title=job");
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: expect.any(Number),
                    title: 'testJob2',
                    salary: 2000,
                    equity: "0.002",
                    companyHandle: 'c2'
                }
            ]
        });
    });

    test("bad request for anon with invalid minSalary filter", async function () {
        const resp = await request(app).get("/jobs?minSalary=onemillion");
        expect(resp.body).toEqual({
            error: {
                message: "minSalary must be a number",
                status: 400
            }
        });
    });

    test("bad request for anon with invalid hasEquity filter", async function () {
        const resp = await request(app).get("/jobs?hasEquity=onemillion");
        expect(resp.body).toEqual({
            error: {
                message: "hasEquity must be a boolean",
                status: 400
            }
        });
    });

    test("bad req for passing in extra filters", async function () {
        const resp = await request(app).get("/jobs?title=job&color=red");
        expect(resp.body).toEqual({
            error: {
                message: ["instance is not allowed to have the additional property \"color\""],
                status: 400
            }
        });
    });

});

/******************************************  GET /jobs/:id   */
describe("GET /jobs/:id", function () {
    test("ok for anon with valid job id", async function () {
        const resp = await request(app).get(`/jobs/${jobId1}`);
        expect(resp.body).toEqual({
            job: {
                id: jobId1,
                title: 'testJob1',
                salary: 1000,
                equity: "0",
                companyHandle: 'c1'
            }
        });
    });

    test("not found for anon with invalid job id", async function () {
        const resp = await request(app).get("/jobs/9999999");
        expect(resp.body).toEqual({
            error: {
                message: "No job id: 9999999",
                status: 404
            }
        });
    });
});

/******************************************  GET /jobs/:id   */
describe("PATCH /jobs/:id", function () {
    test("ok for admin with valid data", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobId1}`)
            .send({
                "title": "new-job",
                "salary": 9999999
            })
            .set("authorization", `Bearer ${u4AdminToken}`);

        expect(resp.body).toEqual({
            job: {
                id: jobId1,
                title: "new-job",
                salary: 9999999,
                equity: "0",
                companyHandle: 'c1'
            }
        });

        const resp2 = await request(app).get(`/jobs/${jobId1}`);
        expect(resp2.body).toEqual({
            job: {
                id: jobId1,
                title: "new-job",
                salary: 9999999,
                equity: "0",
                companyHandle: 'c1'
            }
        });
    });

    test("unauthorized for non-admin with valid data", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobId1}`)
            .send({
                "title": "new-job",
                "salary": 9999999
            })
            .set("authorization", `Bearer ${u1Token}`);

        expect(resp.body).toEqual({
            error: {
                message: "Unauthorized",
                status: 401
            }
        });
    });

    test("bad request for admin with invalid data", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobId1}`)
            .send({
                "id": 67890123,
                "title": "new-job",
                "salary": 9999999,
                "companyHandle": "new company"
            })
            .set("authorization", `Bearer ${u4AdminToken}`);

        expect(resp.body).toEqual({
            error: {
                message: [
                    "instance is not allowed to have the additional property \"id\"",
                    "instance is not allowed to have the additional property \"companyHandle\""
                ],
                status: 400
            }
        });
    });

    test("bad request for admin with no data", async function () {
        const resp = await request(app)
            .patch(`/jobs/${jobId1}`)
            .send({})
            .set("authorization", `Bearer ${u4AdminToken}`);

        expect(resp.body).toEqual({
            error: {
                message: "No data",
                status: 400
            }
        });
    });

});

/******************************************  DELETE /jobs/:id   */
describe("DELETE /jobs:id", function () {
    test("ok for admin", async function () {
        const resp = await request(app)
            .delete(`/jobs/${jobId1}`)
            .set("authorization", `Bearer ${u4AdminToken}`);
        expect(resp.body).toEqual({ deleted: `${jobId1}` });

        const resp2 = await request(app).get(`/jobs/${jobId1}`);
        expect(resp2.body).toEqual({
            error: {
                message: `No job id: ${jobId1}`,
                status: 404
            }
        })
    })

    test("unauth for regular users", async function () {
        const resp = await request(app)
            .delete(`/jobs/${jobId1}`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.body).toEqual({
            error: {
                message: "Unauthorized",
                status: 401
            }
        });

        const resp2 = await request(app).get(`/jobs/${jobId1}`);
        expect(resp2.body).toEqual({
            job: {
                id: jobId1,
                title: 'testJob1',
                salary: 1000,
                equity: "0",
                companyHandle: 'c1'
            }
        })
    })
})