---
title: new blog
date: 2024-04-20 10:40:15
---
测试博客

```JavaScript
const path = require('path');
const fs = require('fs');

const program = require('commander');

const convertCsvToXlsx = require('./convertCsvToXlsx');

if (module === require.main) {
  /*
   Variables
   *********************************************************/
  const pkg = require('../package.json');

  /*
   Program
   *********************************************************/
  program
    .version(pkg.version, '-v, --version')
    .option('-i, --input-dir [dir]', 'Input directory that has the CSV files', 'csv')
    .option('-o, --output-dir [dir]', 'Output directory for the XLSX files', 'xlsx');

  program.on('--help', function () {
    console.log(``);
    console.log(`Created by: ${pkg.author.name}`);
    console.log(`Please report bugs at: ${pkg.bugs.url}`);
    console.log(`Version: ${pkg.version}`);
  });

  program.parse(process.argv);

  const programOptions = program.opts();

  const csvPath = path.join(process.cwd(), programOptions.inputDir);
  const xlsxPath = path.join(process.cwd(), programOptions.outputDir);

  // check the csvPath
  if (!fs.existsSync(csvPath)) {
    // csv folder doesn't exist, doing it wrong
    console.error(`Invalid input directory: ${csvPath}\n`);
    process.exitCode = 1;
    program.help(); // exit immediately
  }

  // check the xlsxPath
  if (!fs.existsSync(xlsxPath)) {
    // create xlsx folder
    console.info(`Creating output directory: ${xlsxPath}`);
    fs.mkdirSync(xlsxPath, { recursive: true });
  }

  // read csvPath
  const csvFiles = fs.readdirSync(csvPath);

  for (const file of csvFiles) {
    // parse file
    const fileObject = path.parse(file);
    // check file extension
    if (fileObject.ext !== '.csv') {
      continue;
    }
    console.info(`Converting: ${fileObject.name}`);
    // convert
    try {
      convertCsvToXlsx(path.join(csvPath, file), path.join(xlsxPath, `${fileObject.name}.xlsx`));
    } catch (e) {
      console.info(`${e.toString()}`);
    }
  }

  console.info(`Complete.`);
} else {
  module.exports = convertCsvToXlsx;
}
```