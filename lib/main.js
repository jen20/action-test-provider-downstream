"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec_1 = require("@actions/exec");
const path = __importStar(require("path"));
const replace = "github.com/pulumi/pulumi-terraform-bridge";
const replaceWith = "../pulumi-terraform-bridge";
const gitUser = "Pulumi Bot";
const gitEmail = "bot@pulumi.com";
function find_gopath() {
    return __awaiter(this, void 0, void 0, function* () {
        let output = "";
        const options = {
            listeners: {
                stdline: (data) => output += data,
            }
        };
        yield exec_1.exec("go", ["env", "GOPATH"], options);
        return output.trim();
    });
}
function find_commit_sha(path) {
    return __awaiter(this, void 0, void 0, function* () {
        let output = "";
        const options = {
            cwd: path,
            listeners: {
                stdline: (data) => output += data,
            }
        };
        yield exec_1.exec("git", ["rev-parse", "--short", "HEAD"]);
        return output.trim();
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const actionId = process.env.GITHUB_ACTION;
            const branchName = `integration/pulumi-terraform-bridge/${actionId}`;
            const checkoutSHA = find_commit_sha(process.cwd());
            const gopathBin = path.join(yield find_gopath(), "bin");
            const newPath = `${gopathBin}:${process.env.PATH}`;
            const parentDir = path.resolve(process.cwd(), "..");
            const downstreamRepo = core.getInput("downstream-url");
            const downstreamName = core.getInput("downstream-name");
            const downstreamDir = path.join(parentDir, downstreamName);
            const inDownstreamOptions = {
                cwd: downstreamDir,
                env: Object.assign(Object.assign({}, process.env), { PATH: newPath }),
            };
            yield exec_1.exec("pwd");
            yield exec_1.exec("ls", ["-la", "../"]);
            yield exec_1.exec("ls", ["-la", "../pulumi-terraform-bridge"]);
            yield exec_1.exec("git", ["clone", downstreamRepo, downstreamDir]);
            yield exec_1.exec("git", ["checkout", "-b", branchName], inDownstreamOptions);
            yield exec_1.exec("git", ["config", "user.name", gitUser], inDownstreamOptions);
            yield exec_1.exec("git", ["config", "user.email", gitEmail], inDownstreamOptions);
            yield exec_1.exec("go", ["mod", "edit", `-replace=${replace}=${replaceWith}`], inDownstreamOptions);
            yield exec_1.exec("go", ["mod", "download"], inDownstreamOptions);
            yield exec_1.exec("git", ["commit", "-a", "-m", "Replace pulumi-terraform-bridge module"], inDownstreamOptions);
            yield exec_1.exec("make", ["only_build"], inDownstreamOptions);
            yield exec_1.exec("git", ["add", "."], inDownstreamOptions);
            yield exec_1.exec("git", ["commit", "--allow-empty", "-m", `Update to pulumi-terraform-bridge@${checkoutSHA}`], inDownstreamOptions);
            //TODO(jen20): Post a diff link back to GitHub status
            yield exec_1.exec("git", ["show"], inDownstreamOptions);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
