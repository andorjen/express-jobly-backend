"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyFilterSchema = require("../schemas/companyFilter.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");

const router = new express.Router();


/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required:  isAdmin 
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, companyNewSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const company = await Company.create(req.body);
  return res.status(201).json({ company });
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  if (Object.keys(req.query).length > 0) {
    const validator = jsonschema.validate(req.query, companyFilterSchema);

    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    let { name, minEmployees, maxEmployees } = req.query;

    let searchTerms = {};

    if (name) {
      searchTerms["name"] = name;
    }
    if (minEmployees) {
      if (Number(minEmployees)) {
        searchTerms["minEmployees"] = Number(minEmployees);
      } else {
        throw new BadRequestError("minEmployees must be a number")
      }
    }
    if (maxEmployees) {
      if (Number(maxEmployees)) {
        searchTerms["maxEmployees"] = Number(maxEmployees);
      } else {
        throw new BadRequestError("maxEmployees must be a number")
      }
    }

    const companies = await Company.filterSearch(searchTerms);
    return res.json({ companies });
  }
  // console.log(req.query, "req query object")

  const companies = await Company.findAll();
  return res.json({ companies });
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  const company = await Company.get(req.params.handle);
  return res.json({ company });
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required:  isAdmin 
 */

router.patch("/:handle", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, companyUpdateSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }

  const company = await Company.update(req.params.handle, req.body);
  return res.json({ company });
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization:  isAdmin 
 */

router.delete("/:handle", ensureAdmin, async function (req, res, next) {
  await Company.remove(req.params.handle);
  return res.json({ deleted: req.params.handle });
});


module.exports = router;
