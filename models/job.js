"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {


    /** Create a job (from data), update db, return new job data.
     *
     * data should be {title, salary, equity, company_handle }
     *
     * Returns { id, title, salary, equity, company_handle }
     *
     * if company_handle doesn't exixt in database, throw BadRequestError
     * */

    static async create({ title, salary, equity, companyHandle }) {
        const validCompanyCheck = await db.query(
            `SELECT handle
             FROM companies
             WHERE handle = $1`,
            [companyHandle]);

        if (validCompanyCheck.rows.length === 0)
            throw new BadRequestError(`Invalid company handle: ${companyHandle}`);

        const result = await db.query(
            `INSERT INTO jobs(title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [title, salary, equity, companyHandle],
        );
        const job = result.rows[0];

        return job;
    }

    /** Find all jobs.
     *
     * Returns [{ id, title, salary, equity, company_handle }, ...]
     * */

    static async findAll() {
        const jobsRes = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            ORDER BY id`);

        // console.log("jobs in model", jobsRes.rows)
        return jobsRes.rows;
    }

    /** given an object of search terms, only allow title, minSalary, hasEquity
     * perform a case insensitive search in jobs database matching all of the search term conditions;
     * 
     *Returns [{ id, title, salary, equity, company_handle}, ...]
     */

    static async filterSearch(searchTerms) {
        // console.log(searchTerms, "search terms");

        const { whereClause, values } = Job._makeWhereClause(searchTerms);

        // console.log(whereClause, "where clause");
        const jobs = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
              FROM jobs
              WHERE ${whereClause}   
              ORDER BY id`,
            values);

        return jobs.rows;
    }

    /** helper function that takes an object of searchTerms, 
     * creates where clasues to be used in db queries, and an array of values with corresponding clause
     * searchTerms should at most contain three keys: title, minSalary, hasEquity
     * if hasEquity is true, search for non-zero equity values, if false, search all 
     * 
     * return {whereClause:`title=$1 AND salary>=$2`, values: [...]}
     */
    static _makeWhereClause(searchTerms) {
        let clauses = [];
        let values = [];

        const { title, minSalary, hasEquity } = searchTerms;

        //check for each item in searchTerms, add corresponding clauses and values to array
        if (title) {
            clauses.push(`title ILIKE $${values.length + 1}`);
            values.push(`%${title}%`)
        }

        if (minSalary) {
            clauses.push(`salary >= $${values.length + 1}`);
            values.push(minSalary);
        }

        if (hasEquity === "true") {
            clauses.push(`equity > 0.0`);
        } else {
            clauses.push(`1=1`);
        }


        // if hasEquity is "false", pass in a generic statament so it will include all
        // this will prevent from having an empty where clause for search query

        //join all clauses to be one string connected by "AND"
        const whereClause = clauses.join(" AND ")
        return { whereClause, values };
    }


    /** Given a job id, return data about a job.
     *
     * Returns { id, title, salary, equity, companyHandle }
     *   
     * Throws NotFoundError if not found.
     **/

    static async get(id) {

        const jobRes = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1`,
            [id]);

        const job = jobRes.rows[0];

        if (!job) throw new NotFoundError(`No job id: ${id}`);

        return job;
    }

    /** Update job data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: {title, salary, equity}
     *
     * Returns {id, title, salary, equity, companyHandle}
     *
     * Throws NotFoundError if not found.
     */

    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                title: "title",
                salary: "salary",
                equity: "equity"
            });
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs
                        SET ${setCols}
                        WHERE id=${idVarIdx}
                        RETURNING id, title, salary, equity, company_handle as "companyHandle"`;

        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job id: ${id}`);

        return job;
    }

    /** Delete given job from database; returns undefined.
     *
     * Throws NotFoundError if job not found.
     **/

    static async remove(id) {
        const result = await db.query(
            `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
            [id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job id: ${id}`);
    }

}


module.exports = Job;
