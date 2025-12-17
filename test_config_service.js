
import { ConfigService } from './src/services/ConfigService.js';

// Mock Legacy Config
const legacyConfig = {
    activeFontStyleId: 'primary',
    fontStyles: {},
    headerStyles: {}
};

// Mock V1 Config
const v1Config = {
    metadata: {
        version: 1,
        appName: 'localize-type'
    },
    data: {
        activeFontStyleId: 'primary',
        fontStyles: {},
        headerStyles: {}
    }
};

// Mock Invalid Config
const invalidConfig = {
    foo: 'bar'
};

console.log("Testing Legacy Impot:");
const normalizedLegacy = ConfigService.normalizeConfig(legacyConfig);
console.log(normalizedLegacy ? "Legacy VALID" : "Legacy INVALID");

console.log("Testing V1 Import:");
const normalizedV1 = ConfigService.normalizeConfig(v1Config);
console.log(normalizedV1 ? "V1 VALID" : "V1 INVALID");

console.log("Testing Invalid Import:");
const normalizedInvalid = ConfigService.normalizeConfig(invalidConfig);
console.log(normalizedInvalid ? "Invalid VALID (Fail)" : "Invalid INVALID (Pass)");
