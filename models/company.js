"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies(
          handle,
          name,
          description,
          num_employees,
          logo_url)
           VALUES
             ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [
        handle,
        name,
        description,
        numEmployees,
        logoUrl,
      ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
      `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** given an object of search terms, only allow name, minEmployees and maxEmployees,
   * perform a case insensitive search in companies database matching all of the search term conditions;
   * 
   *Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   */

  static async filterSearch(searchTerms) {

    const { whereClause, values } = Company._makeWhereClause(searchTerms);

    const companies = await db.query(
      `SELECT handle,
        name,
        description,
        num_employees AS "numEmployees",
        logo_url AS "logoUrl"
              FROM companies
              WHERE ${whereClause}   
              ORDER BY name`,
      values);

    return companies.rows;
  }

  /** helper function that takes an object of searchTerms, 
   * creates where clasues to be used in db queries, and an array of values with corresponding clause
   * searchTerms should at most contain three keys: name, minEmployees and maxEmployees;
   * 
   * if minEmployees > maxEmployees, throw BadRequestError;
   * return {whereClause:`name=$1 AND...`, values: [...]}
   */
  static _makeWhereClause(searchTerms) {
    let clauses = [];
    let values = [];
    let indexPointer = 0;

    const { name, minEmployees, maxEmployees } = searchTerms;

    //check for each item in searchTerms, add corresponding clauses and values to array
    if (name) {
      clauses.push(`name ILIKE $${indexPointer + 1}`);
      values[indexPointer] = `%${name}%`;
      indexPointer += 1;
    }

    if (minEmployees) {
      clauses.push(`num_employees >= $${indexPointer + 1}`);
      values[indexPointer] = minEmployees;
      indexPointer += 1;
    }

    if (maxEmployees) {
      if (minEmployees && minEmployees > maxEmployees) {
        throw new BadRequestError("maxEmployees must be higher than minEmployees");
      } else {
        clauses.push(`num_employees <= $${indexPointer + 1}`);
        values[indexPointer] = maxEmployees;
        indexPointer += 1;
      }
    }

    //join all clauses to be one string connected by "AND"
    const whereClause = clauses.join(" AND ")

    return { whereClause, values };
  }
  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
        name,
        description,
        num_employees AS "numEmployees",
        logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
      UPDATE companies
      SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }

}


module.exports = Company;
