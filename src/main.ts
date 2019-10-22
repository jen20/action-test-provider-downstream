import * as core from "@actions/core";
import {exec} from "@actions/exec";
import * as path from "path";

const replace = "github.com/pulumi/pulumi-terraform-bridge";
const replaceWith = "../pulumi-terraform-bridge";
const gitUser = "Pulumi Bot";
const gitEmail = "bot@pulumi.com";

async function find_gopath(): Promise<string> {
    let output = "";
    const options = {
        listeners: {
            stdline: (data) => output += data,
        }
    };

    await exec("go", ["env", "GOPATH"], options);

    return output.trim();
}

async function find_commit_sha(path: string): Promise<string> {
    let output = "";
    const options = {
        cwd: path,
        listeners: {
            stdline: (data) => output += data,
        }
    };

    await exec("git", ["rev-parse", "--short", "HEAD"]);

    return output.trim();
}

async function run() {
    try {
        const actionId = process.env.GITHUB_ACTION;
        const branchName = `integration/pulumi-terraform-bridge/${actionId}`;
        const checkoutSHA = find_commit_sha(process.cwd());

        const gopathBin = path.join(await find_gopath(), "bin");
        const newPath = `${gopathBin}:${process.env.PATH}`;

        const parentDir = path.resolve(process.cwd(), "..");
        const downstreamRepo = core.getInput("downstream-url");
        const downstreamName = core.getInput("downstream-name");
        const downstreamDir = path.join(parentDir, downstreamName);

        const inDownstreamOptions = {
            cwd: downstreamDir,
            env: {
                ...process.env,
                PATH: newPath,
            },
        };

        await exec("pwd");
        await exec("ls", ["-la", "../"]);
        await exec("ls", ["-la", "../pulumi-terraform-bridge"]);
        await exec("git", ["clone", downstreamRepo, downstreamDir]);

        await exec("git", ["checkout", "-b", branchName], inDownstreamOptions);
        await exec("git", ["config", "user.name", gitUser], inDownstreamOptions);
        await exec("git", ["config", "user.email", gitEmail], inDownstreamOptions);

        await exec("go", ["mod", "edit", `-replace=${replace}=${replaceWith}`], inDownstreamOptions);
        await exec("go", ["mod", "download"], inDownstreamOptions);
        await exec("git", ["commit", "-a", "-m", "Replace pulumi-terraform-bridge module"], inDownstreamOptions);

        await exec("make", ["only_build"], inDownstreamOptions);

        await exec("git", ["add", "."], inDownstreamOptions);
        await exec("git", ["commit", "--allow-empty", "-m", `Update to pulumi-terraform-bridge@${checkoutSHA}`], inDownstreamOptions);

        //TODO(jen20): Post a diff link back to GitHub status

        await exec("git", ["show"], inDownstreamOptions);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
