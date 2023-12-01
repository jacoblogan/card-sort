const fs = require('fs');
const path = require('path');
const csv=require('csvtojson')
const data = require('../data/myData.json');

const dataFileName = './data/myData.json';
const pullFolder = './data/pull';
const addFolder = './data/add';
const pullSheetLocation = './data/csv/pullSheet.csv';

function getPullFile(){
    return `${pullFolder}/${fs.readdirSync(pullFolder)[0]}`;
}

function getAddFile(){
    return `${addFolder}/${fs.readdirSync(addFolder)[0]}`;
}

function writeToDataFile(dataObject){
    fs.writeFileSync(dataFileName, JSON.stringify(dataObject, undefined, 1), 'utf-8');
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

function generatePullSheet() {
    const tcgPlayerFileName = getPullFile();
    const cb = (pullList) => {
        pullList.pop(); // remove last item of array in a pull sheet this is a summary line
        // The pull list does not have a TCGplayer Id we need to find it using name/condition/set/number
        const boxPullSheet = {};
        const idKeys = pullList.map((d) => `${d["Product Name"]}${d["Condition"]}${d["Set"]}${d["Number"]}`);
        Object.keys(data).forEach((k) => {
            const entry = data[k];
            const idKey = `${entry["Product Name"]}${entry["Condition"]}${entry["Set Name"]}${entry["Number"]}`;
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
                        quantity: pullAmount
                    }
                    quantity = quantity - pullAmount;
                }
            }
        });
        console.log(boxPullSheet);
        return boxPullSheet;
    }
    return csv().fromFile(tcgPlayerFileName).then(cb);
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
    const csvLines = [`Box,Name,Quantity,Condition,Set`];
    const boxes = Object.keys(pullData);
    boxes.forEach((boxNumber) => {
        const cardIds = Object.keys(pullData[boxNumber]);
        cardIds.forEach((cid) => {
            cardData = pullData[boxNumber][cid];
            csvLines.push(`${boxNumber},"${cardData['name']}",${cardData['quantity']},"${cardData['condition']}","${cardData['set']}"`);
        });
    });
    fs.writeFileSync(pullSheetLocation, csvLines.join('\n'), 'utf-8');
}

AddInventoryToBox(2);

// const pullSheet = "./data/TCGplayer_PullSheet_20231125_044651.csv";
// generatePullSheet(pullSheet).then((removeDict) => {
//     console.log(removeDict);
//     removeFromData(removeDict);
//     writeToDataFile(data);
// });

// generatePullSheet().then((pullData) => {
//     writePullSheetCSV(pullData);
// });