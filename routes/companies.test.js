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

const invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ";

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
beforeEach(async function () {
  await db.query(`
  INSERT INTO jobs(title, 
                  salary, 
                  equity, 
                  company_handle)
  VALUES ($1, $2, $3, $4)`,
    ['testJob1', 1000, 0.001, 'c1']);

});
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("ok for admins", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u4AdminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });

    const compRes = await db.query(
      `SELECT handle, name, logo_url
      FROM companies
      WHERE handle='new'`
    );
    expect(compRes.rows[0]).toEqual({
      handle: "new",
      name: "New",
      logo_url: "http://new.img"
    });
  });

  test("unauthorized for non-admin users", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401
      }
    });
    const compRes = await db.query(
      `SELECT handle, name, logo_url
      FROM companies
      WHERE handle='new'`
    );
    expect(compRes.rows).toEqual([])
  });

  test("unauthorized for invalid tokens", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${invalidToken}`);
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
      .post("/companies")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${u4AdminToken}`);
    expect(resp.statusCode).toEqual(400);   //test for the entire body
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        ...newCompany,
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u4AdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          {
            handle: "c2",
            name: "C2",
            description: "Desc2",
            numEmployees: 2,
            logoUrl: "http://c2.img",
          },
          {
            handle: "c3",
            name: "C3",
            description: "Desc3",
            numEmployees: 3,
            logoUrl: "http://c3.img",
          },
        ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
      .get("/companies")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});


/************************************** GET /companies with query strings */

describe("GET /companies with query params", function () {
  test("ok for one param", async function () {
    const resp = await request(app).get("/companies?name=c");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          },
          {
            handle: "c2",
            name: "C2",
            description: "Desc2",
            numEmployees: 2,
            logoUrl: "http://c2.img",
          },
          {
            handle: "c3",
            name: "C3",
            description: "Desc3",
            numEmployees: 3,
            logoUrl: "http://c3.img",
          },
        ],
    });
  });

  test("ok for three params", async function () {
    const resp = await request(app).get("/companies?name=c&minEmployees=1&maxEmployees=1");
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "c1",
            name: "C1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          }
        ],
    });
  });

  test("pass in invalid minEmployees param", async function () {
    const resp = await request(app).get("/companies?minEmployees=string");
    expect(resp.body).toEqual({
      "error": {
        "message": "minEmployees must be a number",
        "status": 400
      }
    });
  });

  test("pass in invalid maxEmployees param", async function () {
    const resp = await request(app).get("/companies?maxEmployees=string&name=c");
    expect(resp.body).toEqual({
      "error": {
        "message": "maxEmployees must be a number",
        "status": 400
      }
    });
  });

  test("pass in extra params", async function () {
    const resp = await request(app).get("/companies?name=c&color=red");
    expect(resp.body).toEqual({
      "error": {
        "message": [
          "instance is not allowed to have the additional property \"color\""
        ],
        "status": 400
      }
    });
  });
});


/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
        jobs: [{
          id: expect.any(Number),
          title: "testJob1",
          salary: 1000,
          equity: "0.001"
        }]
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {
    const resp = await request(app).get(`/companies/c2`);
    expect(resp.body).toEqual({
      company: {
        handle: "c2",
        name: "C2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
        jobs: []
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual({
      error: {
        message: "No company: nope",
        status: 404
      }
    });
  });

});

/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u4AdminToken}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
    const compRes = await db.query(
      `SELECT handle, name, logo_url
      FROM companies
      WHERE handle='c1'`
    );
    expect(compRes.rows[0]).toEqual({
      handle: "c1",
      name: "C1-new",
      logo_url: "http://c1.img"
    });

  });

  test("unauthorized for non-admin users", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401
      }
    });
    const compRes = await db.query(
      `SELECT handle, name, logo_url
      FROM companies
      WHERE handle='c1'`
    );
    expect(compRes.rows[0]).toEqual({
      handle: "c1",
      name: "C1",
      logo_url: "http://c1.img"
    });

  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      });
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401
      }
    });
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${u4AdminToken}`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual({
      error: {
        message: "No company: nope",
        status: 404
      }
    });
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${u4AdminToken}`);
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual({
      error: {
        message: ["instance is not allowed to have the additional property \"handle\""],
        status: 400
      }
    });
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u4AdminToken}`);
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual({
      error: {
        message: ["instance.logoUrl does not conform to the \"uri\" format"],
        status: 400
      }
    });
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u4AdminToken}`);
    expect(resp.body).toEqual({ deleted: "c1" });

    const compRes = await db.query(
      `SELECT handle, name, logo_url
      FROM companies
      WHERE handle='c1'`
    );
    expect(compRes.rows).toEqual([]);

  });

  test("unauthorized for non-admin users", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401
      }
    });

    const compRes = await db.query(
      `SELECT handle, name, logo_url
      FROM companies
      WHERE handle='c1'`
    );
    expect(compRes.rows[0]).toEqual({
      handle: "c1",
      name: "C1",
      logo_url: "http://c1.img"
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      error: {
        message: "Unauthorized",
        status: 401
      }
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${u4AdminToken}`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual({
      error: {
        message: "No company: nope",
        status: 404
      }
    });
  });

  test("not found if company already deleted", async function () {
    await db.query(
      `DELETE
      FROM companies
      WHERE handle = 'c1'`
    );

    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u4AdminToken}`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual({
      error: {
        message: "No company: c1",
        status: 404
      }
    });
  });

});
