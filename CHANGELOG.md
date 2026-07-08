# Changelog

## Unreleased

### Features

* expose transport locations, status snapshots, and route snapshots through public API endpoints
* add transport OpenAPI, dataset discovery, release pin, and fixture-backed e2e coverage

## [0.2.0](https://github.com/Open-Syria/datasets-api/compare/v0.1.1...v0.2.0) (2026-07-08)


### Features

* align dataset provenance contracts ([86ddef4](https://github.com/Open-Syria/datasets-api/commit/86ddef441f13209e53321b42e2c60aef098e6e28))
* expose transport dataset api ([f83a09f](https://github.com/Open-Syria/datasets-api/commit/f83a09f057a370d575e67f83c0ebacd6ecb1b7aa))


### Bug Fixes

* disable required deps in transport smoke ([684c7e0](https://github.com/Open-Syria/datasets-api/commit/684c7e0a517b41c1efec9daec174448e349b1c22))
* stabilize dependency validation flow ([e01dc0f](https://github.com/Open-Syria/datasets-api/commit/e01dc0f0a9304c6befa08ae7ef299f7cba6c98a8))

## [0.1.1](https://github.com/Open-Syria/datasets-api/compare/v0.1.0...v0.1.1) (2026-07-06)


### Bug Fixes

* align OpenAPI release version ([fe7c327](https://github.com/Open-Syria/datasets-api/commit/fe7c3277b37d2e3eb16fa7648595fe85a9cad1d0))

## [0.1.0](https://github.com/Open-Syria/datasets-api/compare/v0.0.1...v0.1.0) (2026-07-04)


### Features

* add API discovery headers ([800fa3b](https://github.com/Open-Syria/datasets-api/commit/800fa3bff45c013810ef1dd3441a9f3c98b58e6c))
* add public API quota and crawler controls ([8323a0c](https://github.com/Open-Syria/datasets-api/commit/8323a0c730f12046161f7c097bcc57d6fc37ce14))
* cache public dataset responses ([89b5345](https://github.com/Open-Syria/datasets-api/commit/89b534559367b28116a7ab835bd73dd13a110144))
* expose universities API endpoints ([029557a](https://github.com/Open-Syria/datasets-api/commit/029557a2d6cbd9dce3be0768f20520e2badc3de3))
* update API docs icons [skip ci] ([e8a22ef](https://github.com/Open-Syria/datasets-api/commit/e8a22efed85075ecb31fec5a22bd553169753478))


### Bug Fixes

* align locality parent contract ([f108cf6](https://github.com/Open-Syria/datasets-api/commit/f108cf6c47a678978ce3ea2b56053db720d22a3d))
* align public docs and query enums ([325c0af](https://github.com/Open-Syria/datasets-api/commit/325c0afed14e92caa19ce143d60a91b7633f2d8b))
* avoid duplicate OpenAPI operation tags [skip ci] ([f7506b8](https://github.com/Open-Syria/datasets-api/commit/f7506b845f8f70bed3670664a16049fd20182274))
* expose current dataset endpoints ([9fddeb5](https://github.com/Open-Syria/datasets-api/commit/9fddeb5dd280ecd498afb18064c79a64b8f2d702))
* expose dataset release metadata ([b7da717](https://github.com/Open-Syria/datasets-api/commit/b7da7177e99d8e24f32c669e0190198de50e43ac))
* expose full geography records ([442e5d0](https://github.com/Open-Syria/datasets-api/commit/442e5d0bef84624500330a18837a45d7d9ea7114))
* mount nginx upstream include outside confd ([45641fe](https://github.com/Open-Syria/datasets-api/commit/45641fe78e9ab46a05ca0c91cf78be28c384abb2))
* move page count into pagination metadata ([dc16aea](https://github.com/Open-Syria/datasets-api/commit/dc16aea98c77ce51874f16a77102c0b9c54f6b59))
* paginate dataset discovery endpoints ([b0e2698](https://github.com/Open-Syria/datasets-api/commit/b0e26981d2c3f0e93f1cff432246224711df18b4))
* rebuild before production release check ([01d107d](https://github.com/Open-Syria/datasets-api/commit/01d107d5ac7d425b0d273c366fdcfe781fbd33d6))
* retry dataset release sync fetches ([1005860](https://github.com/Open-Syria/datasets-api/commit/100586088221893f6d231f84122def048de9508f))
* share pagination helpers across list endpoints ([61619ad](https://github.com/Open-Syria/datasets-api/commit/61619ad46ef41f611ada867607e20802998a06da))
* tolerate pnpm argument delimiter in release check ([fab0190](https://github.com/Open-Syria/datasets-api/commit/fab0190540f74bcd2449aac89af823f1d1eddb4f))
* use deploy environment variable names ([dbf112b](https://github.com/Open-Syria/datasets-api/commit/dbf112b9352d01ac49d0d04ac712d76c3df9b2c9))

## 0.0.1

Initial maintained baseline for the OpenSyria datasets API release flow.
