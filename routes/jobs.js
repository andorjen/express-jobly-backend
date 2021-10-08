

"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobFilterSchema = require("../schemas/jobFilter.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * input job should be { title, salary, equity, company_handle }
 *
 * Returns { id, title, salary, equity, company_handle }
 *
 * Authorization required: isAdmin 
 */

router.post("/", ensureAdmin, async function (req, res, next) {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
});

/** GET /  =>
 *   { jobs: [ { id, title, salary, equity, company_handle }, ...] }
 *
 * Can filter on provided search filters:
 * - title (will find case-insensitive, partial matches)
 * - minSalary
 * - hasEquity
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {

    if (Object.keys(req.query).length > 0) {
        const validator = jsonschema.validate(req.query, jobFilterSchema);

        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        let { title, minSalary, hasEquity } = req.query;

        let searchTerms = {};

        if (title) {
            searchTerms["title"] = title;
        }
        if (minSalary) {
            if (Number(minSalary) && Number(minSalary) > 0) {
                searchTerms["minSalary"] = Number(minSalary);
            } else {
                throw new BadRequestError("minSalary must be a number");
            }
        }
        if (hasEquity) {
            if (hasEquity === "true" || "false") {
                searchTerms["hasEquity"] = hasEquity;
            } else {
                throw new BadRequestError("hasEquity must be a boolean");
            }
        }

        const jobs = await Job.filterSearch(searchTerms);
        return res.json({ jobs });
    }

    const jobs = await Job.findAll();
    return res.json({ jobs });

});


/** GET /[id]  =>  { job }
 *
 *  job is { id, title, salary, equity, company_handle  }
 *  
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
    const job = await Job.get(req.params.id);
    return res.json({ job });
});



/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, company_handle }
 *
 * Authorization required:  isAdmin 
 */

router.patch("/:id", ensureAdmin, async function (req, res, next) {
    // console.log("hit patch route")
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: isAdmin 
 */

router.delete("/:id", ensureAdmin, async function (req, res, next) {
    await Job.remove(req.params.id);
    return res.json({ deleted: req.params.id });
});


module.exports = router;
