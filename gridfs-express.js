var Grid = require('gridfs-stream');
var mongo = require('mongodb');
var express = require('express');

var db = new mongo.Db('cnjsdemo', new mongo.Server("127.0.0.1", 27017));
db.open(function(err, db) {
	console.log('db connected');
	db.authenticate('demo', 'demo', function(){
		console.log('db authenticated');
	});
});
var gfs = Grid(db, mongo);

var app = express();

app.route('/:fileName').get(function(req, res, next){
	var options = { filename: req.param('fileName')};

	gfs.files.find(options).toArray(function (err, files) {
		if (err) {
			console.error(err);
			return res.send(404);;
		}

		var file = files[0];
		var total = file.length;

		if (req.headers['range']) {
			res.statusCode = 206;
			var range = req.headers.range;
			var parts = range.replace(/bytes=/, "").split("-");
			var partialstart = parts[0];
			var partialend = parts[1];

			 var start = parseInt(partialstart, 10);
			var end = partialend ? parseInt(partialend, 10) : total - 1;
			var chunksize = (end - start) + 1;

			res.set("Content-Range", "bytes " + start + "-" + end + "/" + total);
			res.set("Accept-Ranges", "bytes");
			res.set("Content-Length", total);
			res.set("Content-Type", "video/webm");

			var readstream = gfs.createReadStream({"_id": file._id, range: {startPos: start, endPos: end}});
			readstream.pipe(res);
		} else {
			res.statusCode = 200;
			res.set("Content-Length", total);
			res.set("Content-Type", "video/webm");
			var readstream = gfs.createReadStream({"_id": file._id});
			readstream.pipe(res);
		}
	});

});

app.listen(3000);
