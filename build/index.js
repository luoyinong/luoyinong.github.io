/**
 * 将srcImages里的图片压缩并添加随机位置水印
 * hexo与fluid提供的压缩文件插件已经过期或者不好用
 */

const path = require("node:path");
const sharp = require("sharp");
const Jimp = require("jimp");
const glob = require("glob");

function getPosition(image, logo) {
  const left = 0;
  const right = image.width - logo.width;
  const top = 0;
  const bottom = image.height - logo.height;
  const yMid = bottom / 2;
  const xMid = right / 2;

  return {
    left,
    right,
    top,
    bottom,
    yMid,
    xMid,
  };
}

function getRandomPos(image, logo) {
  const position = getPosition(image, logo);

  const percentage = {
    bottomRight: 0.6,
    bottomLeft: 0.1,
    mid: 0.1,
    topRight: 0.1,
    topLeft: 0.1,
  };
  const ran = Math.random();

  if (percentage.bottomRight > ran) {
    return {
      y: position.bottom,
      x: position.right,
    };
  }

  if (percentage.bottomLeft > ran - percentage.bottomRight) {
    return {
      y: position.bottom,
      x: position.left,
    };
  }

  if (
    percentage.topRight >
    ran - percentage.bottomRight - percentage.bottomLeft
  ) {
    return {
      y: position.top,
      x: position.right,
    };
  }

  if (
    percentage.topLeft >
    ran - percentage.bottomRight - percentage.bottomLeft - percentage.topRight
  ) {
    return {
      y: position.top,
      x: position.left,
    };
  }

  return {
    x: position.xMid,
    y: position.yMid,
  };
}

function getResizeOption(image, logo) {
  const logoPercent = 10;

  if (image.width > logo.width * 2) {
    return [(image.width * logoPercent) / 100, Jimp.AUTO];
  }

  if (image.width > logo.width) {
    return [(image.width * logoPercent * 2) / 100, Jimp.AUTO];
  }

  return [image.width, Jimp.AUTO];
}

function getCompositeOptions(image, logo) {
  const logoCopy = logo.clone();

  logoCopy.resize(...getResizeOption(image.bitmap, logoCopy.bitmap));

  const { x, y } = getRandomPos(image.bitmap, logoCopy.bitmap);

  return [
    logoCopy,
    x,
    y,
    [
      {
        mode: Jimp.BLEND_SCREEN,
        opacitySource: 1,
        opacityDest: 1,
      },
    ],
  ];
}

function getIdentity(imagePath) {
  return {
    filename: path.basename(imagePath),
    parentDir: path.dirname(imagePath).split(path.sep).pop(),
  };
}

function getAddedImages() {
  const srcImages = glob.globSync(["build/srcImages/**/*.png"]);
  const markedImages = glob.globSync(["source/img/**/*.png"], {
    ignore: ["dragonGirl.webp", "favicon.png"],
  });

  const targetImages = markedImages.map((path) => {
    const identity = getIdentity(path);

    return {
      path,
      ...identity,
    };
  });

  return srcImages.filter((src) => {
    const srcIdentity = getIdentity(src);

    return !targetImages.some(
      (target) =>
        target.filename == srcIdentity.filename &&
        target.parentDir == srcIdentity.parentDir
    );
  });
}

async function main() {
  const images = getAddedImages();
  const logo = await Jimp.read("build/logo.png");

  images.forEach(async (imagePath) => {
    try {
      const { filename, parentDir } = getIdentity(imagePath);

      const buffer = await sharp(imagePath)
        .png({
          compressionLevel: 6,
        })
        .toBuffer();

      const image = await Jimp.read(buffer);

      const options = getCompositeOptions(image, logo);

      await image.composite(...options);

      await image.writeAsync(
        path.resolve(__dirname, "../source/img", parentDir, filename)
      );

      console.log(`handle image successfully: ${parentDir}/${filename}`);
    } catch (e) {
      console.error(e);
    }
  });
}

main();
