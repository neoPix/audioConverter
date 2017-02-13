const glob = require("glob");
const fs = require('fs');
const yaml = require('js-yaml');
const exec = require('child_process').exec;
var htmlToText = require('html-to-text');

const langMap = {
	fr: 'french',
	en: 'english-us'
};

function cbToPromise (fn, ctx, ...args) {
	return new Promise((resolve, reject) => {
		args.push(function(err, obj){
			if(err) {
				reject(err);
			}
			else {
				resolve(obj);
			}
		});
		fn.apply(ctx, args);
	});
}

function mkDir(path) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path,0744);
    }
}

function processYieldable(it) {
	return new Promise((resolve, reject) => {
		function process() {
			let next = it.next();
			if(!next.done) {
				next.value.then(() => {
					process();
				}, err=> reject(err));
			}
			else {
				resolve();
			}
		}
		process();
	});
}

function *processFiles (files) {
	let i = 0;
	for(let file of files) {
		i++;
		yield cbToPromise(fs.readFile, fs, file, 'utf8').then(text => {
			let lang = file.split('/')[2];
			let command = `espeak -f ${file} -v ${langMap[lang]} --stdout -s 145 -p 55 -b 1 | ffmpeg -i - -ar 44100 -ac 2 -ab 128k -f mp3 ${file.replace('.tts.txt', 'mp3')} -y`;
			console.info(`processing ${i}/${files.length}`)
			return cbToPromise(exec, null, command);
		});
	}
}

cbToPromise(glob, null, 'audio/**/*.tts.txt', {})
.then(files => processYieldable(processFiles(files)))
.catch(err => console.error(err));