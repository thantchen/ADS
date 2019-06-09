module.exports = {
  roots: [
    '<rootDir>/src',
  ],
  testMatch: [
    '**/?(*.)+(spec|test).ts?(x)'
  ],
  preset: 'ts-jest',
  modulePaths: ['src']
}
