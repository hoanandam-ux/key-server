module.exports = {
  adsTime: process.env.ADS_TIME || 30,
  checkAds: (startTime) => {
    const now = Date.now();
    return (now - startTime) / 1000 >= module.exports.adsTime;
  }
};
