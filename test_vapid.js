function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const key1 = "BO02vu7mvy8oDCzb8PqV7f64_9wfcSK9zAPmdLivlbCWkpe48cBXJcy7jzaMbiJ2_jwgPAj0zvo2RPnGMVQp5ic";
const arr1 = urlBase64ToUint8Array(key1);
console.log(arr1.slice(0, 5));
