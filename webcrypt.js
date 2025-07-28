class Webcrypt {
  static encrypt = async (m, k) => await crypto.subtle.encrypt({ name: "AES-CBC", iv: k[1] }, k[0], new TextEncoder().encode(m));
  static decrypt = async (d, k) => new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-CBC", iv: k[1] }, k[0], d));
  static genKey = async _ => [await window.crypto.subtle.generateKey({ name: "AES-CBC", length: 256 }, true, ["encrypt", "decrypt"]), window.crypto.getRandomValues(new Uint8Array(16))];
}
