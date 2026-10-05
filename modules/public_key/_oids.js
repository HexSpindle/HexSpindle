export const OID_NAMES = {
  '1.2.840.113549.1.1.1': 'rsaEncryption', '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption', '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption', '1.2.840.113549.1.1.10': 'rsassaPss',
  '1.2.840.113549.1.1.7': 'rsaOAEP',
  '1.2.840.10045.2.1': 'ecPublicKey', '1.2.840.10045.3.1.7': 'prime256v1', '1.3.132.0.34': 'secp384r1',
  '1.3.132.0.35': 'secp521r1', '1.3.132.0.10': 'secp256k1', '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
  '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384', '1.2.840.10045.4.3.4': 'ecdsa-with-SHA512',
  '1.2.840.10045.4.1': 'ecdsa-with-SHA1',
  '1.2.840.10040.4.1': 'dsaEncryption', '1.2.840.10040.4.3': 'dsa-with-sha1',
  '2.16.840.1.101.3.4.3.2': 'dsa-with-sha256',
  '2.5.4.3': 'commonName', '2.5.4.6': 'countryName', '2.5.4.7': 'localityName', '2.5.4.8': 'stateOrProvinceName',
  '2.5.4.10': 'organizationName', '2.5.4.11': 'organizationalUnitName', '2.5.4.5': 'serialNumber',
  '2.5.29.14': 'subjectKeyIdentifier', '2.5.29.15': 'keyUsage', '2.5.29.17': 'subjectAltName',
  '2.5.29.19': 'basicConstraints', '2.5.29.31': 'cRLDistributionPoints', '2.5.29.35': 'authorityKeyIdentifier',
  '2.5.29.37': 'extKeyUsage', '2.5.29.32': 'certificatePolicies',
  '1.3.101.110': 'X25519', '1.3.101.111': 'X448', '1.3.101.112': 'Ed25519', '1.3.101.113': 'Ed448',
  '1.2.840.113549.1.9.1': 'emailAddress', '1.2.840.113549.1.9.14': 'extensionRequest',
  '2.16.840.1.101.3.4.2.1': 'sha256', '2.16.840.1.101.3.4.2.2': 'sha384', '2.16.840.1.101.3.4.2.3': 'sha512',
  '1.3.14.3.2.26': 'sha1',
  '1.2.840.113549.1.5.13': 'PBES2', '1.2.840.113549.1.5.12': 'PBKDF2',
  '1.2.840.113549.2.7': 'hmacWithSHA1', '1.2.840.113549.2.9': 'hmacWithSHA256',
  '1.2.840.113549.2.10': 'hmacWithSHA384', '1.2.840.113549.2.11': 'hmacWithSHA512',
  '2.16.840.1.101.3.4.1.2': 'aes128-CBC-PAD', '2.16.840.1.101.3.4.1.22': 'aes192-CBC-PAD',
  '2.16.840.1.101.3.4.1.42': 'aes256-CBC-PAD',
};

export const EC_CURVE_OID_TO_NAME = {
  '1.2.840.10045.3.1.7': 'secp256r1', '1.3.132.0.34': 'secp384r1', '1.3.132.0.35': 'secp521r1', '1.3.132.0.10': 'secp256k1',
};
export const EC_CURVE_NAME_TO_WEBCRYPTO = { secp256r1: 'P-256', secp384r1: 'P-384', secp521r1: 'P-521' };
export const EC_CURVE_OID_TO_WEBCRYPTO = {
  '1.2.840.10045.3.1.7': 'P-256', '1.3.132.0.34': 'P-384', '1.3.132.0.35': 'P-521',
};
export const WEBCRYPTO_CURVE_TO_OID = { 'P-256': '1.2.840.10045.3.1.7', 'P-384': '1.3.132.0.34', 'P-521': '1.3.132.0.35' };

export const RFC4514_ABBR = {
  '2.5.4.3': 'CN', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.10': 'O', '2.5.4.11': 'OU', '2.5.4.6': 'C',
  '2.5.4.9': 'STREET', '0.9.2342.19200300.100.1.25': 'DC', '0.9.2342.19200300.100.1.1': 'UID',
};

export const NAME_OID = {
  CN: '2.5.4.3', O: '2.5.4.10', OU: '2.5.4.11', C: '2.5.4.6', ST: '2.5.4.8', L: '2.5.4.7', emailAddress: '1.2.840.113549.1.9.1',
};
