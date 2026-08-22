import ImageKit, { toFile } from '@imagekit/nodejs';

const imagekit = new ImageKit({
     publicKey: process.env['IMAGEKIT_PUBLIC_KEY'],
     privateKey: process.env['IMAGEKIT_PRIVATE_KEY'], // This is the default and can be omitted
     urlEndpoint: process.env['IMAGEKIT_URL_ENDPOINT'],
});

export { toFile };
export default imagekit;