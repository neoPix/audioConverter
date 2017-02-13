const glob = require("glob");
const fs = require('fs');
const yaml = require('js-yaml');
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
	for(let file of files) {
		let filename = file.split('/').pop().split('.').shift();
		yield cbToPromise(fs.readFile, fs, file, 'utf8').then(text => {

			let parts = text.split('---');
			parts.shift();
			let doc = yaml.load(parts.shift());
			let body = parts.join('---');

			mkDir('audio');
			mkDir(`audio/david-balan`);
			mkDir(`audio/david-balan/${doc.lang}`);

			fs.writeFileSync(`audio/david-balan/${doc.lang}/${filename}.tts.txt`, `${doc.title}

				${htmlToText.fromString(body, {hideLinkHrefIfSameAsText: false, noLinkBracket: true, ignoreImage: true})}`, 'utf8');
		});
	}
}

cbToPromise(glob, null, '../balandavid/source/**/*.md', {})
.then(files => processYieldable(processFiles(files)))
.catch(err => console.error(err));