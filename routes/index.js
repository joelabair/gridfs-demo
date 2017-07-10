var Grid = require('gridfs-stream');
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;

var express = require('express');
var router = express.Router();

var gfs;
var url = 'mongodb://demo:demo@localhost:27017/nocojsdemo';

MongoClient.connect(url, function(err, db) {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	gfs = Grid(db, mongo);
});

var lookup = function lookup(req, res, next) {
	var options = req.params.fileName ?  { filename: req.params.fileName} : {};

	gfs.files.find(options).toArray(function (err, files) {
		if (err) {
			return next(err);
		}
		if (!files.length) {
			res.locals.message = 'Not Found';
			res.status(404);
			res.render('error');
			return;
		}
		res.locals.list = files;
		res.locals.file = files[0];
		next();
	});
};


router.get('/', lookup, function(req, res, next) {
	res.set("Accept-Ranges", "bytes");

	res.render('index', { title: 'GridFS Demo' });
});


router.head('/:fileName', lookup, function(req, res, next) {
	var file = res.locals.file ;
	var total = file.length;
	var type = file.contentType;

	if (!file) {
		res.locals.message = 'Not Found';
		res.status(404);
		res.render('error');
		return;
	}

	res.set("Accept-Ranges", "bytes");
	res.set("Content-Length", total);
	res.set("Content-Type", type);
	res.send(200);
});


router.get('/:fileName', lookup, function(req, res, next) {
	var file = res.locals.file ;
	var total = file.length;
	var type = file.contentType;

	if (!file) {
		res.locals.message = 'Not Found';
		res.status(404);
		res.render('error');
		return;
	}

	res.statusCode = 206;
	var range = req.headers.range || 'bytes=0-';
	var parts = range.replace(/bytes=/, "").split("-");
	var partialstart = parts[0];
	var partialend = parts[1];
	var def = ((total / 100) > 16000) ? Math.round(total / 250) : 16000;
	if (def > 255000) def = 255000;

	var start = parseInt(partialstart, 10);
	var end = partialend ? parseInt(partialend, 10) : start+def;
	if (end > total - 1) end = total - 1;
	var chunksize = (end - start) + 1;

	res.set("Accept-Ranges", "bytes");
	res.set("Content-Range", "bytes " + start + "-" + end + "/" + total);
	res.set("Content-Length", chunksize);
	res.set("Content-Type", type);
	if (!chunksize) {
		res.status(416).send('Range Not Satisfiable');
		return;
	}

	gfs.createReadStream({"_id": file._id, range: {startPos: start, endPos: end}}).pipe(res);
});

module.exports = router;
