const { BadRequestError } = require("../expressError");

/** Function that helps create parts of SQL query strings with placeholders,
 * and an array with values corresponding to each placeholder;
 * 
 * It takes an object of dataToUpdate, and an object of column names jsToSql, 
 * jsToSql has javascript version name as keys, and sql version name as values;
 * 
 * fuction then creates sql query string based on dataToUpdate to set each key to a $placeholder in pg 
 * related to their index, if key exist in jsToSql, key will become the SQL column name, else remain the same;
 * 
 * returns an object of the query string and an array of the values to set for each placeholder;
 * 
 * If dataToUpdate object is empty, throw badRequestError("no data");
 * 
 * dataToUpdate can contain keys that don't exist in jsToSql.
 * 
 * example:
 * dataToUpdate: {firstName: "test", lastName: "testy", email: "test@test.com"} 
 * jsToSql: {firsName: first_name, lastName: last_name, email: email, isAdmin: is_admin}
 * 
 * output will be:
 * {
 * setCols: `first_name=$1, last_name=$2, email=$3`,
 * values: ["test", "testy", "test@test.com"]
 * 
 * example2:
 * dataToUpdate: {firstName: "test", email: "test@test.com", somethingElse: "nothing"} 
 * jsToSql: {firsName: first_name}
 * 
 * output will be:
 * {
 * setCols: `first_name=$1, email=$2, somethingElse=$3`
 * values: ["test", "test@test.com", "nothing"]
 * }
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
    `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
