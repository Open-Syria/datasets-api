# Changelog

## Unreleased

### Features

* expose transport locations, status snapshots, and route snapshots through public API endpoints
* add transport OpenAPI, dataset discovery, release pin, and fixture-backed e2e coverage
* verify every exact dataset pin, collection endpoint, and filtered OpenAPI document during deployment

### Bug Fixes

* prevent partial or newer cached dataset releases from being reported as the configured production set
* stage verified JSON-only release syncs and reject mismatched release identities
* verify the public production ingress after blue/green deployment
* update vulnerable runtime dependencies, constrain patched transitives, and audit the complete graph during validation
* share production image layers, refresh and retry registry pulls, and allow bounded cold ARM pulls to finish

## [0.3.5](https://github.com/Open-Syria/datasets-api/compare/v0.3.4...v0.3.5) (2026-09-17)


### Bug Fixes

* **deploy:** bound production resources and support restricted hosts ([#61](https://github.com/Open-Syria/datasets-api/issues/61)) ([f983773](https://github.com/Open-Syria/datasets-api/commit/f983773279b49713c91dc5763ee402d50b7397f9))
* **deploy:** preserve dataset access for distinct runtime user ([#63](https://github.com/Open-Syria/datasets-api/issues/63)) ([3a8ab23](https://github.com/Open-Syria/datasets-api/commit/3a8ab23188c83fcf88159c10ef21c48137ce82e6))
* **import:** bound bulk transactions for smaller hosts ([#64](https://github.com/Open-Syria/datasets-api/issues/64)) ([cf50e4a](https://github.com/Open-Syria/datasets-api/commit/cf50e4aee4102e88e23a7ce70f60fbc09cc9410a))

## [0.3.4](https://github.com/Open-Syria/datasets-api/compare/v0.3.3...v0.3.4) (2026-08-19)


### Bug Fixes

* **deploy:** use approved API operations ([d9290b8](https://github.com/Open-Syria/datasets-api/commit/fb41457f22ec60fa2dbd4a7ade776c275e9ffbad))
* **deploy:** use approved API operations ([f1e3fd4](https://github.com/Open-Syria/datasets-api/commit/0e25b1abc23b9bfb4fd90aed8420324194eb5efb))

## [0.3.3](https://github.com/Open-Syria/datasets-api/compare/v0.3.2...v0.3.3) (2026-08-19)


### Bug Fixes

* **deploy:** use approved container diagnostics ([0ed4f6b](https://github.com/Open-Syria/datasets-api/commit/9ed208e992d1d3e2efc6f0ce026e1d5467873be6))
* **deploy:** use approved container diagnostics ([97d767a](https://github.com/Open-Syria/datasets-api/commit/e206b0969745cd3ec9c5c31e195cb448933b1ba9))

## [0.3.2](https://github.com/Open-Syria/datasets-api/compare/v0.3.1...v0.3.2) (2026-08-19)


### Bug Fixes

* **deploy:** use approved network diagnostics ([31417b7](https://github.com/Open-Syria/datasets-api/commit/9ed5deaf97ef5d7486aa10cf18210ad699e02b01))
* **deploy:** use approved network diagnostics ([edd3a30](https://github.com/Open-Syria/datasets-api/commit/62a7fb48683356abbafdbc42ed21d3e9e43e2e52))

## [0.3.1](https://github.com/Open-Syria/datasets-api/compare/v0.3.0...v0.3.1) (2026-08-19)


### Bug Fixes

* **deploy:** sanitize recovery Redis secret ([033dd3b](https://github.com/Open-Syria/datasets-api/commit/ab2c2af54f5d6cb6bf3d86571f14dac140dac853))
* **deploy:** sanitize recovery Redis secret ([56dd4f1](https://github.com/Open-Syria/datasets-api/commit/ceb81e1bc6bfe0f6b08efca4bc3aaa55f106fa5c))

## [0.3.0](https://github.com/Open-Syria/datasets-api/compare/v0.2.1...v0.3.0) (2026-08-19)


### Features

* **deploy:** harden OpenSyria production API ([7c9b656](https://github.com/Open-Syria/datasets-api/commit/1078e5d09984bc2380b82cc763ee7a08aa1edf16))
* **deploy:** harden OpenSyria production API ([#29](https://github.com/Open-Syria/datasets-api/issues/29)) ([b142c25](https://github.com/Open-Syria/datasets-api/commit/ba3d3f14faef2be88cbaba530b3cf3547860effb))
* expose telecom dataset endpoints ([da3f06c](https://github.com/Open-Syria/datasets-api/commit/7c30430e881d5e1429341e8965e25d24822c8cd8))


### Bug Fixes

* **ci:** allow automatic production deploy job ([327a675](https://github.com/Open-Syria/datasets-api/commit/9c635dfdf0a70d38d7ada48913145a0ca2d63a74))
* **ci:** run automatic production deploy after image build ([75d4614](https://github.com/Open-Syria/datasets-api/commit/63b43812851757f3fe46b1a8b02e8513eb50629d))
* **deploy:** serialize and stabilize nginx cutovers ([32c8e0b](https://github.com/Open-Syria/datasets-api/commit/598697394e1db5259025bd90778027ef2c7db6ce))
* **deploy:** stabilize traffic cutovers ([d2d3c90](https://github.com/Open-Syria/datasets-api/commit/9682492160890be5a999c73b267b748662516a1d))
* enforce pinned dataset deployment integrity ([48bedb7](https://github.com/Open-Syria/datasets-api/commit/a75765732b6216ef893fb1e9a377793c2bd61d3c))
* make production image pulls resilient ([2225f73](https://github.com/Open-Syria/datasets-api/commit/35aa709893eda7d76c0ecb17f402c03c697da718))
* pin geography dataset v0.1.5 ([28ba890](https://github.com/Open-Syria/datasets-api/commit/2f9b5af4290ea0782531cd8900149b853afa7ab7))

## [0.2.1](https://github.com/Open-Syria/datasets-api/compare/v0.2.0...v0.2.1) (2026-07-08)


### Bug Fixes

* align fastify dependency graph ([141435f](https://github.com/Open-Syria/datasets-api/commit/79ab402bd71fb9d67cfe2826481741b86a896bb6))

## [0.2.0](https://github.com/Open-Syria/datasets-api/compare/v0.1.1...v0.2.0) (2026-07-08)


### Features

* align dataset provenance contracts ([86ddef4](https://github.com/Open-Syria/datasets-api/commit/232ffac427dee3216554b12e1f97d15dfc7d2a53))
* expose transport dataset api ([f83a09f](https://github.com/Open-Syria/datasets-api/commit/0b5101bccddbdd251244f97d09d9d05930f9f9eb))


### Bug Fixes

* disable required deps in transport smoke ([684c7e0](https://github.com/Open-Syria/datasets-api/commit/def602f8b6d778c6760ac91cde59ab21bb83181a))
* stabilize dependency validation flow ([e01dc0f](https://github.com/Open-Syria/datasets-api/commit/21667142debf418c461774c96f6c6a0cf7c4a1ed))

## [0.1.1](https://github.com/Open-Syria/datasets-api/compare/v0.1.0...v0.1.1) (2026-07-06)


### Bug Fixes

* align OpenAPI release version ([fe7c327](https://github.com/Open-Syria/datasets-api/commit/cb42a80aab1157bdc737e32abaea00e1872b3062))

## [0.1.0](https://github.com/Open-Syria/datasets-api/compare/v0.0.1...v0.1.0) (2026-07-04)


### Features

* add API discovery headers ([800fa3b](https://github.com/Open-Syria/datasets-api/commit/e2cfa5959d0903ad8c016d7732e420ea5ff621f0))
* add public API quota and crawler controls ([8323a0c](https://github.com/Open-Syria/datasets-api/commit/94d098fbe2cf07ca1fd77ace19fcee7e062821b5))
* cache public dataset responses ([89b5345](https://github.com/Open-Syria/datasets-api/commit/2e5e1f94757824025f4d3d17c6b433b4f18fb33f))
* expose universities API endpoints ([029557a](https://github.com/Open-Syria/datasets-api/commit/d64a0db7a5d8a5ed0725f73d5c76c34d8ccda603))
* update API docs icons [skip ci] ([e8a22ef](https://github.com/Open-Syria/datasets-api/commit/cca6612e83cde9fff95b2168b48bff4ceb23f493))


### Bug Fixes

* align locality parent contract ([f108cf6](https://github.com/Open-Syria/datasets-api/commit/e6825d6358182b5f6c1bdbec332fccf9f80b718f))
* align public docs and query enums ([325c0af](https://github.com/Open-Syria/datasets-api/commit/7a0d881dae99eccdb58809768522acdb434abf5c))
* avoid duplicate OpenAPI operation tags [skip ci] ([f7506b8](https://github.com/Open-Syria/datasets-api/commit/3db2e0c111df67d8c9b33779327c3fff5b812c4e))
* expose current dataset endpoints ([9fddeb5](https://github.com/Open-Syria/datasets-api/commit/06595c9d98911751ee91e52ce12129d254b30826))
* expose dataset release metadata ([b7da717](https://github.com/Open-Syria/datasets-api/commit/054b8e37bcc7c5666fd2506c651b4f6197726ff7))
* expose full geography records ([442e5d0](https://github.com/Open-Syria/datasets-api/commit/cf34612456bf663506f1f724c577064cb93e8a0f))
* mount nginx upstream include outside confd ([45641fe](https://github.com/Open-Syria/datasets-api/commit/33556e00e780cc3fd3a840c14a03bfb9b1e26eb9))
* move page count into pagination metadata ([dc16aea](https://github.com/Open-Syria/datasets-api/commit/ab3bed72b7c25e0398b1d23aea5297edbe5c6042))
* paginate dataset discovery endpoints ([b0e2698](https://github.com/Open-Syria/datasets-api/commit/d6ab0794bcdd9f753c4a428dd9d2a1c1da06b29a))
* rebuild before production release check ([01d107d](https://github.com/Open-Syria/datasets-api/commit/493a0d1ea596cccf6cf265935b9d6590e01727f0))
* retry dataset release sync fetches ([1005860](https://github.com/Open-Syria/datasets-api/commit/28d2cf95a822e9afed89f827d474090491bff704))
* share pagination helpers across list endpoints ([61619ad](https://github.com/Open-Syria/datasets-api/commit/659008a75deba8614d04e593fe3c8d3adeb70e55))
* tolerate pnpm argument delimiter in release check ([fab0190](https://github.com/Open-Syria/datasets-api/commit/89ef33dbd292fcbf8193ccb48531592750128183))
* use deploy environment variable names ([dbf112b](https://github.com/Open-Syria/datasets-api/commit/e9a3a7c9bdc1f64d7d7ab98e646bb6b18f976b67))

## 0.0.1

Initial maintained baseline for the OpenSyria datasets API release flow.
