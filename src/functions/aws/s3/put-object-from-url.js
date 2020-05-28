const s3Service = require("../../../services/s3.service");
const { success, failure } = require("../../../helpers/response.utils");

module.exports.main = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const { id } = event.pathParameters;
  s3Service
    .putObjectFromURL(getPayload(event.body), id)
    .then(data => callback(null, success(data)))
    .catch(err => callback(null, failure(err)));
};

function getPayload(data) {
  let payload
  try {
    payload = JSON.parse(data)
  } catch (ignore) {
    const jsonFromBuffer = Buffer.from(data || '{}', 'base64')
    payload = JSON.parse(jsonFromBuffer.toString('utf8'))
  }
  return payload
}
