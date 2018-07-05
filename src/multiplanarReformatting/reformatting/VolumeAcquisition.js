import Volume from './Volume.js';
import VolumeCache from './VolumeCache.js';
import convertFloatDataToInteger from './convertFloatDataToInteger.js';
import ImageId from './ImageId.js';
import minMaxNDarray from '../shared/minMaxNDarray.js';

/* eslint import/extensions: off */
import ndarray from 'ndarray';

// Private methods symbols
const decompress = Symbol('decompress');
const readMetaData = Symbol('readMetaData');
const readImageData = Symbol('readImageData');
const determineImageDependentMetaData = Symbol('determineImageDependentMetaData');
const transformImageData = Symbol('transformImageData');
const createVolume = Symbol('createVolume');
const cacheVolume = Symbol('cacheVolume');

/* eslint class-methods-use-this: off */

/**
 * A singleton that is responsible for getting a Volume for a stack of imageIds.
 *
 * It can either get it from its cache, or load a file with an asynchronous
 * request and process it to return the volume. Main method is acquire(imageId).
 */
export default class VolumeAcquisition {

  constructor () {
    this.volumeCache = new VolumeCache();
    this.volumePromises = {};
  }

  static getInstance () {
    if (!VolumeAcquisition.instance) {
      VolumeAcquisition.instance = new VolumeAcquisition();
    }

    return VolumeAcquisition.instance;
  }

  acquire (imageIdObject) {
    // Checks if there already is a promise to fetch the whole volume (with data)
    const cachedVolumePromise = this.volumePromises[imageIdObject.stackId];

    if (cachedVolumePromise && cachedVolumePromise.wholeFilePromise) {
      return cachedVolumePromise.wholeFilePromise;
    }

    // If no one has requested this volume yet, we create a promise to acquire it
    const volumeAcquiredPromise = new Promise((resolve, reject) => {
      const cachedVolume = this.volumeCache.get(imageIdObject);

      if (cachedVolume && cachedVolume.hasImageData) {
        resolve(cachedVolume);

        return;
      }


      //const stack = getStack(imageIdObject.stackId);

      // TODO: Get stack data from stackId
      const imageIds = [
        'example://1',
        'example://2',
        'example://3'
      ];

      const { cornerstone } = external;
      const promises = imageIds.map(imageId => {
        return cornerstone.loadAndCacheImage(imageId);
      });

      Promise.all(promises).then(data => {
        console.log(data);
      }, error => {
        throw new Error(error);
      });
    });

    // Save this promise to the promise cache
    this.volumePromises[imageIdObject.stackId] = this.volumePromises[imageIdObject.stackId] || {};
    this.volumePromises[imageIdObject.stackId].wholeFilePromise = volumeAcquiredPromise;

    return volumeAcquiredPromise;
  }

  [determineImageDependentMetaData] ({ metaData, imageDataNDarray }) {
    if (metaData.isWindowInfoAbsent) {
      // If the window information (min and max values) are absent in the
      // File, we calculate sensible values considering the minimum and
      // Maximum pixel values considering not just the slice being shown,
      // But all of them
      Object.assign(metaData, determineWindowValues(metaData.slope, metaData.intercept, metaData.minPixelValue, metaData.maxPixelValue));
    } else {
      Object.assign(metaData, determineWindowValues(1, 0, metaData.windowMinimumValue, metaData.windowMaximumValue));
    }

    return {
      metaData,
      imageDataNDarray
    };
  }

  [createVolume] ({ metaData, imageDataNDarray }, imageIdObject) {
    return new Volume(imageIdObject, metaData, imageDataNDarray, metaData.floatImageDataNDarray);
  }

  [cacheVolume] (volume, imageIdObject) {
    this.volumeCache.add(imageIdObject, volume);

    return volume;
  }
}

function determineWindowValues (slope, intercept, minValue, maxValue) {
  const maxVoi = maxValue * slope + intercept;
  const minVoi = minValue * slope + intercept;

  return {
    windowCenter: (maxVoi + minVoi) / 2,
    windowWidth: (maxVoi - minVoi)
  };
}
