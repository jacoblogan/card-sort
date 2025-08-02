const fs = require('fs');
const path = require('path');
const csv=require('csvtojson')
const data = require('../data/myData.json');
const backlog = require('../data/backlog.json');
const PDFDocument = require("pdfkit");
const PDFTable = require('pdfkit-table');
const csv2 = require("csv-parser");

const dataFileName = './data/myData.json';
const backlogDataFileName = './data/backlog.json';
const pullFolder = './data/pull';
const addFolder = './data/add';
const backlogFolder = './data/backlog';
const pullSheetLocation = './data/csv/pullSheet.csv';
const pullPDF = './data/csv/pullSheet.pdf';
const storePDF = './data/csv/storePullSheet.pdf';
const backlogPDF = './data/csv/backlogPullSheet.pdf';
const stagedCSV = './data/csv/staged.csv';
const results = [];
const shippingFolder = './data/shipping';
const shippingOutputFolder = './data/shippingOutput';
const MIN_QUANTITY = 10;
const MAX_QUANTITY = 20;

const getShippingFile = () => {
    return `${shippingFolder}/${fs.readdirSync(shippingFolder)[0]}`;
}

function getPullFile(){
    return `${pullFolder}/${fs.readdirSync(pullFolder)[0]}`;
}

function getAddFile(){
    return `${addFolder}/${fs.readdirSync(addFolder)[0]}`;
}

function getBacklogFile(){
    return `${backlogFolder}/${fs.readdirSync(backlogFolder)[0]}`;
}

function writeToDataFile(dataObject){
    fs.writeFileSync(dataFileName, JSON.stringify(dataObject, undefined, 1), 'utf-8');
}

function totalQuantity(cardData, condition) {
    if(!cardData || !cardData.Boxes){
        return 0;
    }
    let total = 0;
    const boxKeys = Object.keys(cardData.Boxes);
    boxKeys.forEach((k) => {
        const box = cardData.Boxes[k];
        if(box[condition]){
            total += box[condition];
        }
    });
    return total;
}

function AddInventoryToBox(boxNumber){
    const inventoryFileName = getAddFile();
    const cb = (jsonObj) => {
        jsonObj = jsonObj.forEach((row) => {
            const quantity = parseInt(row['Total Quantity']);
            if(quantity){
                const id = row['TCGplayer Id'];
                data[id] = data[id] || {
                    "TCGplayer Id": row["TCGplayer Id"],
                    "Product Line": row["Product Line"],
                    "Set Name": row["Set Name"],
                    "Product Name": row["Product Name"],
                    "Title": row["Title"],
                    "Number": row["Number"],
                    "Rarity": row["Rarity"],
                    "Condition": row["Condition"],
                    "Boxes":{}
                   };
                let box = data[id]["Boxes"][boxNumber] || {};
                let count = box[row["Condition"]] ? parseInt(box[row["Condition"]]) + parseInt(row["Total Quantity"]) : parseInt(row["Total Quantity"]);
                box[row["Condition"]] = count;
                data[id]["Boxes"][boxNumber] = box;
            }
        });

        fs.writeFileSync(dataFileName, JSON.stringify(data, undefined, 1), 'utf-8');
    }

    csv().fromFile(inventoryFileName).then(cb);
}

function addBacklog(storeBox, backlogBox) {
    const backlogFileName = getBacklogFile();
    const cb = (jsonObj) => {
        const storePullSheet = [];
        const backlogPullSheet = [];
        jsonObj = jsonObj.forEach((row) => {
            const quantity = parseInt(row['Add to Quantity']);
            if(quantity){
                const id = row['TCGplayer Id'];
                const dataRow = data[id];
                if(!dataRow || totalQuantity(dataRow, row["Condition"]) < MIN_QUANTITY){
                    data[id] = data[id] || {
                        "TCGplayer Id": row["TCGplayer Id"],
                        "Product Line": row["Product Line"],
                        "Set Name": row["Set Name"],
                        "Product Name": row["Product Name"],
                        "Title": row["Title"],
                        "Number": row["Number"],
                        "Rarity": row["Rarity"],
                        "Condition": row["Condition"],
                        "Boxes":{}
                       };
                    const totalCount = totalQuantity(dataRow, row["Condition"]);
                    const quantityToAdd = Math.min(quantity, MAX_QUANTITY - totalCount);
                    let box = data[id]["Boxes"][storeBox] || {};
                    let count = box[row["Condition"]] ? parseInt(box[row["Condition"]]) + quantityToAdd : quantityToAdd;
                    box[row["Condition"]] = count;
                    data[id]["Boxes"][storeBox] = box;
                    storePullSheet.push([storeBox,row["Product Name"],quantityToAdd,row["Condition"],row["Set Name"],row["Number"], row["TCGplayer Id"], row["TCG Marketplace Price"]]);

                    if(quantityToAdd < quantity){
                        const remainingQuantity = quantity - quantityToAdd;
                        backlog[id] = backlog[id] || {
                            "TCGplayer Id": row["TCGplayer Id"],
                            "Product Line": row["Product Line"],
                            "Set Name": row["Set Name"],
                            "Product Name": row["Product Name"],
                            "Title": row["Title"],
                            "Number": row["Number"],
                            "Rarity": row["Rarity"],
                            "Condition": row["Condition"],
                            "Boxes":{}
                           };
                        let box = backlog[id]["Boxes"][backlogBox] || {};
                        let count = box[row["Condition"]] ? parseInt(box[row["Condition"]]) + remainingQuantity : remainingQuantity;
                        box[row["Condition"]] = count;
                        backlog[id]["Boxes"][backlogBox] = box;
                        backlogPullSheet.push([backlogBox,row["Product Name"],remainingQuantity,row["Condition"],row["Set Name"],row["Number"]]);
                    }
                }else{
                    backlog[id] = backlog[id] || {
                        "TCGplayer Id": row["TCGplayer Id"],
                        "Product Line": row["Product Line"],
                        "Set Name": row["Set Name"],
                        "Product Name": row["Product Name"],
                        "Title": row["Title"],
                        "Number": row["Number"],
                        "Rarity": row["Rarity"],
                        "Condition": row["Condition"],
                        "Boxes":{}
                       };
                    let box = backlog[id]["Boxes"][backlogBox] || {};
                    let count = box[row["Condition"]] ? parseInt(box[row["Condition"]]) + quantity : quantity;
                    box[row["Condition"]] = count;
                    backlog[id]["Boxes"][backlogBox] = box;
                    backlogPullSheet.push([backlogBox,row["Product Name"],quantity,row["Condition"],row["Set Name"],row["Number"]]);
                }
            }
        });

        const storeHeaders = ['Box','Name','Add to Quantity','Condition','Set','Number', 'TCGplayer Id', 'TCG Marketplace Price'];
        fs.writeFileSync(dataFileName, JSON.stringify(data, undefined, 1), 'utf-8');
        fs.writeFileSync(backlogDataFileName, JSON.stringify(backlog, undefined, 1), 'utf-8');
        fs.writeFileSync(stagedCSV, [storeHeaders.join(','), ...storePullSheet.map((r)=>{
            // escape commas in name and set
            r[1] = `"${r[1].replace(/"/g, '""')}"`;
            r[4] = `"${r[4].replace(/"/g, '""')}"`;
            return r.join(',')
        })].join('\n'), 'utf-8');

        writePullSheet(storePDF, storePullSheet.map((r) => r.slice(0,6)));
        writePullSheet(backlogPDF, backlogPullSheet);

    }

    csv().fromFile(backlogFileName).then(cb);
}

function generateId(keyArray, data) {
    return keyArray.reduce((acc, key) => {
        return acc + data[key];
    }, '').toLowerCase();
}

function generatePullSheet() {
    const tcgPlayerFileName = getPullFile();
    const cb = (pullList) => {
        pullList.pop(); // remove last item of array in a pull sheet this is a summary line
        // The pull list does not have a TCGplayer Id we need to find it using name/condition/set/number
        const boxPullSheet = {};
        const idKeys = pullList.map((d) => {
            const pullKeyArray = ['Product Name', 'Condition', 'Set', 'Number'];
            return generateId(pullKeyArray, d);
        });
        Object.keys(data).forEach((k) => {
            const entry = data[k];
            const dataKeyArray = ['Product Name', 'Condition', 'Set Name', 'Number'];
            const idKey = generateId(dataKeyArray, entry);
            if(idKeys.includes(idKey)){
                let index = idKeys.indexOf(idKey);
                pullList[index]["TCGplayer Id"] = entry["TCGplayer Id"];
            }
        });
        pullList.forEach((row) => {
            const cond =  row["Condition"];
            const id = row["TCGplayer Id"];
            let quantity = parseInt(row["Quantity"]);
            const cardData = data[id];
            if(!cardData){
                console.log('Card Not Found:');
                console.log(row);
                return;
            }
            const boxKeys = Object.keys(cardData.Boxes);
            let boxQuantities = [];
            boxKeys.forEach((key) => {
                const cardsInBox = cardData.Boxes[key];
                boxQuantities.push({
                    box: key,
                    quantity: cardsInBox[cond] || 0
                });
            });
            boxQuantities.sort((a,b) => a.quantity < b.quantity ? 1 : -1);
            for(let i = 0; i < boxQuantities.length; i++){
                if(quantity > 0){
                    const bv = boxQuantities[i];
                    const pullAmount = Math.min(quantity, bv.quantity);
                    boxPullSheet[bv.box] = boxPullSheet[bv.box] || {};
                    boxPullSheet[bv.box][id] = {
                        name: row["Product Name"],
                        condition: cond,
                        set: row["Set"],
                        quantity: pullAmount,
                        number: row["Number"]
                    }
                    quantity = quantity - pullAmount;
                }
            }
        });
        // console.log(boxPullSheet);
        return boxPullSheet;
    }
    return csv().fromFile(tcgPlayerFileName).then(cb);
}

function generateDirectPullSheet() {
    const tcgPlayerFileName = getPullFile();
    const cb = (pullList) => {
        pullList.shift(); // remove the first 2 items from the array which is the warning line and header line
        pullList.shift();
        // The pull list does not have a TCGplayer Id we need to find it using name/condition/set/number
        const boxPullSheet = {};
        const idKeys = pullList.map((d) => {
            const pullKeyArray = ['Product Name', 'Condition', 'Set', 'Number'];
            return generateId(pullKeyArray, d);
        });
        Object.keys(data).forEach((k) => {
            const entry = data[k];
            const dataKeyArray = ['Product Name', 'Condition', 'Set Name', 'Number'];
            const idKey = generateId(dataKeyArray, entry);
            if(idKeys.includes(idKey)){
                let index = idKeys.indexOf(idKey);
                pullList[index]["TCGplayer Id"] = entry["TCGplayer Id"];
            }
        });
        pullList.forEach((row) => {
            const cond =  row["Condition"];
            const id = row["TCGplayer Id"];
            let quantity = parseInt(row["Quantity"]);
            const cardData = data[id];
            if(!cardData){
                console.log('Card Not Found:');
                console.log(row);
                return;
            }
            const boxKeys = Object.keys(cardData.Boxes);
            let boxQuantities = [];
            boxKeys.forEach((key) => {
                const cardsInBox = cardData.Boxes[key];
                boxQuantities.push({
                    box: key,
                    quantity: cardsInBox[cond] || 0
                });
            });
            boxQuantities.sort((a,b) => a.quantity < b.quantity ? 1 : -1);
            for(let i = 0; i < boxQuantities.length; i++){
                if(quantity > 0){
                    const bv = boxQuantities[i];
                    const pullAmount = Math.min(quantity, bv.quantity);
                    boxPullSheet[bv.box] = boxPullSheet[bv.box] || {};
                    boxPullSheet[bv.box][id] = {
                        name: row["Product Name"],
                        condition: cond,
                        set: row["Set"],
                        quantity: pullAmount,
                        number: row["Number"]
                    }
                    quantity = quantity - pullAmount;
                }
            }
        });
        // console.log(boxPullSheet);
        return boxPullSheet;
    }

    return csv({
        noheader:true,
        headers: ['Product Name','Set','Rarity','Number','Color','Condition','Quantity']
    }).fromFile(tcgPlayerFileName).then(cb);
}

function removeFromData(removeDict) {
    const boxKeys = Object.keys(removeDict);
    boxKeys.forEach((k) => {
        const removeValues = removeDict[k];
        const cardIds = Object.keys(removeValues);
        cardIds.forEach((cid) => {
            const cv = removeValues[cid];
            data[cid]["Boxes"][k][cv.condition] = data[cid]["Boxes"][k][cv.condition] - cv.quantity;
        });
    });
}

function writePullSheetCSV(pullData) {
    const csvLines = [`Box,Name,Quantity,Condition,Set,Number`];
    const boxes = Object.keys(pullData);
    boxes.forEach((boxNumber) => {
        const cardIds = Object.keys(pullData[boxNumber]);
        let unsortedData = [];
        cardIds.forEach((cid) => {
            cardData = pullData[boxNumber][cid];
            unsortedData.push(cardData);
        });
        const sortedData = unsortedData.sort((a,b) => {
            if(a['set'].localeCompare(b['set']) !== 0){
                return a['set'].localeCompare(b['set']);
            }
            var textA = a['name'].toUpperCase();
            var textB = b['name'].toUpperCase();
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });
        sortedData.forEach((cardData) => {
            csvLines.push(`${boxNumber},"${cardData['name']}",${cardData['quantity']},"${cardData['condition']}","${cardData['set']}","${cardData['number']}"`);
        });
    });
    fs.writeFileSync(pullSheetLocation, csvLines.join('\n'), 'utf-8');
}

function writePDFPullTable(pullData) {
    const rows = [];
    const boxes = Object.keys(pullData);
    boxes.forEach((boxNumber) => {
        const cardIds = Object.keys(pullData[boxNumber]);
        let unsortedData = [];
        cardIds.forEach((cid) => {
            cardData = pullData[boxNumber][cid];
            unsortedData.push(cardData);
        });
        const sortedData = unsortedData.sort((a,b) => {
            if(a['set'].localeCompare(b['set']) !== 0){
                return a['set'].localeCompare(b['set']);
            }
            var textA = a['name'].toUpperCase();
            var textB = b['name'].toUpperCase();
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });
        sortedData.forEach((cardData) => {
            rows.push([boxNumber,cardData['name'],cardData['quantity'],cardData['condition'],cardData['set'],cardData['number']]);
        });
    });

    writePullSheet(pullPDF, rows);
}

function writePullSheet(pdfSheet, rows, headers = ['Box','Name','Quantity','Condition','Set','Number']) {
    // Create a new PDF document
    const doc = new PDFTable({ 
        size: 'letter', 
        layout: 'portrait',
        margins: { top: 36, bottom: 36, left: 36, right: 36 } // 0.5 inch margins
    });
    doc.pipe(fs.createWriteStream(pdfSheet));

    // Define table headers and data
    const pdfRows = rows;
    // Calculate available width and height for the table
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

    const columnWidths = {
        0: 30,
        1: (pageWidth-205)/2,
        2: 50,
        3: 75,
        4: (pageWidth-205)/2,
        5: 50
    };
    // Create table with alternating row colors
    const table = {
        headers: headers.map((header, idx) => {
            const retVal = { label: header, property: header };
            if(columnWidths[idx]){
                retVal.width = columnWidths[idx];
            }
            return retVal;
        }),
        rows: pdfRows,
        options: {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8).fillColor('black'),
            prepareRow: (row, indexColumn, indexRow, rectRow) => {
                const condition = row[3];
                const font = condition.toLowerCase().indexOf('foil') !== -1 ? 'Helvetica-Bold' : 'Helvetica';
                doc.font(font).fontSize(11).fillColor('black');
                if (indexRow % 2 === 0) {
                    doc.addBackground(rectRow, 'lightgray');
                }
            },
            padding: 5,
            columnSpacing: 5,
            width: pageWidth,
            x: doc.page.margins.left,
            y: doc.page.margins.top
        }
    };

    // Add table to the document
    doc.table(table, {
        // columnsSize:[40, null, null, null, null, 75],
        width: pageWidth,
        height: pageHeight
    });

    // Finalize the PDF and end the stream
    doc.end();
}

function generateShipping() {
  fs.createReadStream(getShippingFile())
  .pipe(csv2())
  .on("data", (data) => results.push(data))
  .on("end", () => {
    // Create a document
    const doc = new PDFDocument();
    let skip = true;

    // Pipe its output somewhere, like to a file or HTTP response
    // See below for browser usage
    doc.pipe(fs.createWriteStream(`${shippingOutputFolder}/${Date.now().toString()}.pdf`));
    doc.save();
    results.forEach((data) => {
      if(skip){
        skip = false;
      }else{
        doc.addPage();
      }
      doc.rotate(270).text("Jake's MTG Store", -660, 185);
      doc.text("2244 S Duval", -660, 200);
      doc.text("Mesa, AZ 85209", -660, 215);

      doc.text(`${data["FirstName"]} ${data["LastName"]}`, -400, 280);
      doc.text(`${data["Address1"]} ${data["Address2"]}`, -400, 295);
      doc.text(
        `${data["City"]}, ${data["State"]} ${data["PostalCode"]}`,
        -400,
        310
      );
    });

    doc.restore();
    // Finalize PDF file
    doc.end();
  });
}

function generateShippingHP() {
  fs.createReadStream(getShippingFile())
  .pipe(csv2())
  .on("data", (data) => results.push(data))
  .on("end", () => {
    // Create a document
    const doc = new PDFDocument();
    let skip = true;

    // Pipe its output somewhere, like to a file or HTTP response
    // See below for browser usage
    doc.pipe(fs.createWriteStream(`${shippingOutputFolder}/${Date.now().toString()}.pdf`));
    doc.save();
    results.forEach((data) => {
      if(skip){
        skip = false;
      }else{
        doc.addPage();
      }
      doc.rotate(270).text("Jake's MTG Store", -640, 20);
      doc.text("2244 S Duval", -640, 35);
      doc.text("Mesa, AZ 85209", -640, 50);

      doc.text(`${data["FirstName"]} ${data["LastName"]}`, -380, 125);
      doc.text(`${data["Address1"]} ${data["Address2"]}`, -380, 140);
      doc.text(
        `${data["City"]}, ${data["State"]} ${data["PostalCode"]}`,
        -380,
        155
      );
    });

    doc.restore();
    // Finalize PDF file
    doc.end();
  });
}

// AddInventoryToBox(151);

// generate add sheet for both tcgplayer and backlog
// also updates the backlog and myData json files with the new inventory
// function params are the store box number and the backlog box number
// addBacklog(19,1);

/**
 * Steps to pull cards
 * Download the pull sheet and place it in the data/pull folder
 * run generatePullSheet()
 * print the resulting csv in data/pull
 * run the generatePullSheet and removeFromData and rewrite the data file
 */

//generate pull sheet, write to csv and remove the data from the data object
// generatePullSheet().then((pullData) => {
//     writePDFPullTable(pullData);
//     removeFromData(pullData);
//     writeToDataFile(data);
// });

// THIS IS FOR USE WITH DIRECT
//generate pull sheet FROM DIRECT CSV EXPORT, write to csv and remove the data from the data object
// generateDirectPullSheet().then((pullData) => {
//     writePDFPullTable(pullData);
//     removeFromData(pullData);
//     writeToDataFile(data);
// });
//THIS IS FOR USE WITH DIRECT


// generate shipping pdf, grabs whichever shipping file is in /shipping and spits out a pdf to /shippingOutput
// generateShipping();