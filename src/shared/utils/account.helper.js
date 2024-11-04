import { hashSHA256 } from "./utils.js";

/**
 *
 * @param {*} rawPassword
 * @param {*} salt
 * @returns
 */
export function genSavedPassword(rawPassword, salt) {
  return hashSHA256(
    `${hashSHA256(`${rawPassword}${salt}`)}${process.env.PEPPER}`
  );
}

/**
 *
 * @param {*} rawPassword
 * @param {*} salt
 * @param {*} storedPassword
 * @returns
 */
export function validatePassword(rawPassword, salt, storedPassword) {
  return storedPassword === genSavedPassword(rawPassword, salt);
}

/**
 *
 * @returns
 */
export function getJwtAccountAttributes() {
  return ["email"];
}
