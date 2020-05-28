"use strict";

const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const axios = require("axios")

const { ListingPhotos } = require('./../models')

const putObjectFromURL = async ({ file }, id) => {

  const headers = {
    responseType: 'arraybuffer'
  }
  const keyS = new Date().valueOf().toString()
  const resp = await axios.get(file, headers)
  const buffer = await Buffer.from(resp.data, 'base64');

  var params = {
    Body: Buffer.from(buffer),
    Bucket: `${process.env.S3_BUCKET}/space-images/${id}`,
    Key: `${keyS}.jpg`,
    ContentEncoding: "base64",
    ContentType: "image/webp",
  };

  return new Promise((resolve, reject) => {
    s3.putObject(params, async (error) => {
      if (error) reject(error)
      const lPhoto = await ListingPhotos.create({
        listingId: id,
        name: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/space-images/${id}/${keyS}.jpg`
      })
      resolve(lPhoto);
    });
  });

};

const putObject = async ({ file }, id) => {
  const keyS = new Date().valueOf().toString()
  var params = {
    Body: Buffer.from(file.replace(/^data:image\/\w+;base64,/, ""), "base64"),
    Bucket: `${process.env.S3_BUCKET}/space-images/${id}`,
    Key: `${keyS}.jpg`,
    ContentEncoding: "base64",
    ContentType: "image/webp"
  };
  return new Promise((resolve, reject) => {
    s3.putObject(params, (error) => {
      if (error) reject(error)
      resolve({
        url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/space-images/${id}/${keyS}.jpg`
      });
    });
  });
};


module.exports = {
  putObject,
  putObjectFromURL
};
