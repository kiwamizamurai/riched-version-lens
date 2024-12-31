// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "ExampleProject",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "ExampleProject",
            targets: ["ExampleProject"]),
    ],
    dependencies: [
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.8.1"),
        .package(url: "https://github.com/SwiftyJSON/SwiftyJSON.git", from: "5.0.1"),
    ],
    targets: [
        .target(
            name: "ExampleProject",
            dependencies: [
                "Alamofire",
                "SwiftyJSON"
            ]),
        .testTarget(
            name: "ExampleProjectTests",
            dependencies: ["ExampleProject"]),
    ]
) 