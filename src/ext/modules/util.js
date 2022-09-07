/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const aesjs = require('aes-js');
const { map } = require("lodash");

const util = require('../../core/modules/util');

const validateFileExtension = (filename, extension) => -1 !== filename.indexOf(extension, filename.length - extension.length);

const getFileBaseName = (filename, extension) => util.sanitizeName(filename.substr(0, filename.length - extension.length));


const key = [64, 14, 190, 99, 77, 107, 95, 26, 211, 235, 41, 125, 110, 237, 151, 148];
const encryptPassword = function(password) {
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
  const passwordBytes = aesjs.utils.utf8.toBytes(password);
  const encryptedBytes = aesCtr.encrypt(passwordBytes);
  return aesjs.utils.hex.fromBytes(encryptedBytes);
};

const decryptPassword = function(encrypted) {
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
  const encryptedBytes = aesjs.utils.hex.toBytes(encrypted);
  const passwordBytes = aesCtr.decrypt(encryptedBytes);
  return aesjs.utils.utf8.fromBytes(passwordBytes);
};

module.exports = {
  validateFileExtension,
  getFileBaseName,
  encryptPassword,
  decryptPassword
};