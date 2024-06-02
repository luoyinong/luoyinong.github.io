/**
 * 将srcImages里的图片压缩并添加随机位置水印
 * hexo与fluid提供的压缩文件插件已经过期或者不好用
 */

const path = require("node:path");
const fs = require("node:fs");
const sharp = require("sharp");
const glob = require("glob");

function getResizeOption(imageMeta, logoMeta) {
  const logoPercent = 10;

  if (imageMeta.width > logoMeta.width * 2) {
    return {
      width: Math.round((imageMeta.width * logoPercent) / 100),
      height: imageMeta.height,
      fit: sharp.fit.inside,
    };
  }

  if (imageMeta.width > logoMeta.width) {
    return {
      width: Math.round((imageMeta.width * logoPercent * 2) / 100),
      height: imageMeta.height,
      fit: sharp.fit.inside,
    };
  }

  return {
    width: imageMeta.width,
    height: imageMeta.height,
    fit: sharp.fit.inside,
  };
}

function getRandomPosition() {
  const percentage = {
    bottomRight: 0.6,
    bottomLeft: 0.1,
    mid: 0.1,
    topRight: 0.1,
    topLeft: 0.1,
  };
  const ran = Math.random();

  if (percentage.bottomRight > ran) {
    return sharp.gravity.southeast;
  }

  if (percentage.bottomLeft > ran - percentage.bottomRight) {
    return sharp.gravity.southwest;
  }

  if (
    percentage.topRight >
    ran - percentage.bottomRight - percentage.bottomLeft
  ) {
    return sharp.gravity.northeast;
  }

  if (
    percentage.topLeft >
    ran - percentage.bottomRight - percentage.bottomLeft - percentage.topRight
  ) {
    return sharp.gravity.northeast;
  }

  return sharp.gravity.centre;
}

async function getCompositeOptions(image, logo) {
  const logoCopy = logo.clone();
  const logoMeta = await logoCopy.metadata();
  const imageMeta = await image.metadata();

  const logoCopyBuffer = await logoCopy
    .resize(getResizeOption(imageMeta, logoMeta))
    .toBuffer();

  return [
    {
      input: logoCopyBuffer,
      gravity: getRandomPosition(),
    },
  ];
}

function getIdentity(imagePath) {
  const ext = path.extname(imagePath);

  return {
    filename: path.basename(imagePath, ext),
    parentDir: path.dirname(imagePath).split(path.sep).pop(),
  };
}

function getAddedImages(ext) {
  const srcImages = glob.globSync(["build/srcImages/**/*.png"]);
  const markedImages = glob.globSync(["source/img/**/*" + ext], {
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
  const targetExt = ".webp";
  const images = getAddedImages(targetExt);
  const logo = await sharp("build/logo.png");
  logo.metadata();

  images.forEach(async (imagePath) => {
    try {
      const { filename, parentDir } = getIdentity(imagePath);

      const image = await sharp(imagePath);
      const options = await getCompositeOptions(image, logo);

      const handledImage = await image.composite(options);
      

      const targePath = path.resolve(
        __dirname,
        "../source/img",
        parentDir,
        filename + targetExt
      );

      fs.mkdirSync(path.dirname(targePath), { recursive: true });

      // 保留文件信息
      await handledImage.withMetadata().toFile(targePath);

      console.log(`handle image successfully: ${parentDir}/${filename}${targetExt}`);
    } catch (e) {
      console.error(e);
    }
  });
}

main();
