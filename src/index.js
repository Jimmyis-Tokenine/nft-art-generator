const { readFileSync, writeFileSync, readdirSync, rmdirSync, existsSync, mkdirSync } = require('fs');
const sharp = require('sharp');

const supportedFormats = ["jpg", "png"];

const genConfig = require("../configs/generation.json");
const {
    size,
    rasterScale,
    total,
    adjectives,
    names,
    outputs,
    outputDir = "./out",
    preferredFormat = "png",
    assetPart = "./assets/sample"
} = genConfig;

const template = `
    <svg width="${size.w}" height="${size.h}" viewBox="0 0 384 400" fill="none" xmlns="http://www.w3.org/2000/svg">

    <!-- bodybase -->
    <!-- bg -->
    <!-- legback -->
    <!-- legbase -->
    <!-- leg -->

    <!-- legbackbase -->
    <!-- body -->
    <!-- belt -->
    <!-- armbackbase -->
    <!-- armback -->
    <!-- armbase -->
    <!-- arm -->

    <!-- neck -->
    <!-- headbase -->

    <!-- eyes -->
    <!-- mouth -->
    <!-- nose -->
    <!-- ears -->
    <!-- head -->
    </svg>
`

const takenNames = {};
const takenFaces = {};
let idx = total - 1;

function randInt(max) {
    return Math.floor(Math.random() * (max + 1)) + 1;
}

function randElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}


function getRandomName() {
    const _adjectives = adjectives.split(' ');
    const _names = names.split(' ');
    
    const randAdj = randElement(_adjectives);
    const randName = randElement(_names);
    const name =  `${randAdj}-${randName}`;


    if (takenNames[name] || !name) {
        return getRandomName();
    } else {
        takenNames[name] = name;
        return name;
    }
}

function getLayer(part, number, skip=0.0) {
    const _number = number < 10 ? "0" + number : number;
    const svg = readFileSync(`${assetPart}/${part}/${_number}.svg`, 'utf-8');
    const re = /(?<=\<svg\s*[^>]*>)([\s\S]*?)(?=\<\/svg\>)/g
    const layer = svg.match(re)[0];
    return Math.random() > skip ? layer : '';
}

async function convertToRaster(name) {
    const src = `${outputDir}/${name}/${name}.svg`;

    const img = await sharp(src);
    const scale = typeof rasterScale !== "undefined" 
        ? rasterScale
        : 1

    const newSize = size.w > size.h
    ? size.h * scale
    : size.w * scale

    const resized = await img.resize(newSize);
    for (const format in outputs.format) {
        if (supportedFormats.includes(format)) {
            const options = outputs.format[format].options || {}
            await resized
                .toFormat(format, options)
                .toFile(`${outputDir}/${name}/${name}.${format}`);
        }
    }
}


function createImage(idx) {

    const bg = randInt(6 - 1);
    const arm = randInt(21 - 1);
    const armback = randInt(18 - 1);
    const belt = randInt(13 - 1);
    const body = randInt(25 - 1);
    const ears = randInt(17 - 1);
    const eyes = randInt(23 - 1);
    const head = randInt(64 - 1);
    const leg = randInt(2 - 1);
    const legback = randInt(2 - 1);
    const mouth = randInt(7 - 1);
    const neck = randInt(22 - 1);
    const nose = randInt(11 - 1);
    // 18,900 combinations

    const face = [
        arm,
        armback,
        belt,
        body,
        ears,
        eyes,
        head,
        leg,
        legback,
        mouth,
        neck,
        nose,
    ].join('');

    if (face[takenFaces]) {
        createImage();
    } else {
        const name = getRandomName()
        console.log(name)
        face[takenFaces] = face;

        const final = template
        .replace('<!-- head -->', getLayer('Head',head))
        .replace('<!-- ears -->', getLayer('Ears',ears))
        .replace('<!-- eyes -->', getLayer('Eyes',eyes))
        .replace('<!-- nose -->', getLayer('Nose',nose))
        .replace('<!-- mouth -->', getLayer('Mouth',mouth))
        .replace('<!-- headbase -->', getLayer('Base','Head'))
        .replace('<!-- neck -->', getLayer('Neck',neck))
        .replace('<!-- arm -->', getLayer('Arm',arm))
        .replace('<!-- armbase -->', getLayer('Base','Arm'))
        .replace('<!-- armback -->', getLayer('ArmBack',armback))
        .replace('<!-- armbackbase -->', getLayer('Base','ArmBack'))
        .replace('<!-- belt -->', getLayer('Belt',belt))
        .replace('<!-- body -->', getLayer('Body',body))
        .replace('<!-- bodybase -->', getLayer('Base','Body'))
        .replace('<!-- leg -->', getLayer('Leg',leg))
        .replace('<!-- legbase -->', getLayer('Base','Leg'))
        .replace('<!-- legback -->', getLayer('LegBack',legback))
        .replace('<!-- legbackbase -->', getLayer('Base','Legback'))
        .replace('<!-- bg -->', getLayer('BG', bg))

        const meta = {
            name,
            description: `A drawing of ${name.split('-').join(' ')}`,
            image: `${idx}.${preferredFormat}`,
            attributes: [
                { 
                    beard: '',
                    rarity: 0.5
                }
            ]
        }
        const outputDir_ = outputDir + "/" + idx;

        if (!existsSync(outputDir_)){
            mkdirSync(outputDir_, { recursive: true });
        }
        writeFileSync(`${outputDir_}/${idx}.json`, JSON.stringify(meta))
        writeFileSync(`${outputDir_}/${idx}.svg`, final)
        convertToRaster(idx)
    }

}


// Create dir if not exists
if (!existsSync(outputDir)){
    mkdirSync(outputDir, { recursive: true });
}

// Cleanup dir before each run
readdirSync(outputDir).forEach(f => rmdirSync(`${outputDir}/${f}`, { recursive: true }));


do {
    createImage(idx);
    idx--;
  } while (idx >= 0);
