import {
    Plugin,
    TFile,
    debounce,
    Notice
} from "obsidian";
import {DEFAULT_SETTINGS, PluginSettings, H1SettingTab} from "./settings";

export default class H1FilenameSync extends Plugin {
    public settings!: PluginSettings;
    private debouncedRename!: (file: TFile) => void;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new H1SettingTab(this.app, this));

        this.createDebounce();

        // 🔁 Sur modification (reset du timer à chaque modif)
        this.registerEvent(
            this.app.vault.on("modify", (file) => {
                if (!(file instanceof TFile)) return;
                if (file.extension !== "md") return;

                if (this.isIgnored(file)) return;

                this.debouncedRename(file);
            })
        );

        // 📂 À l’ouverture du fichier
        this.registerEvent(
            this.app.workspace.on("file-open", (file) => {
                if (!(file instanceof TFile)) return;
                if (file.extension !== "md") return;

                if (this.isIgnored(file)) return;

                this.debouncedRename(file);
            })
        );
    }

    createDebounce() {
        this.debouncedRename = debounce(
            (file: TFile) => this.renameFromH1(file, false),
            this.settings.delay,
            true // reset à chaque appel
        );
    }

    isIgnored(file: TFile): boolean {
        const folders = this.settings.ignoredFolders
            .split(",")
            .map(f => f.trim())
            .filter(Boolean);

        return folders.some(folder => file.path.startsWith(folder + "/"));
    }

    buildRegex(): RegExp {
        const chars = this.settings.invalidChars
            .split(",")
            .map(c => c.trim())
            .filter(Boolean)
            .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); // escape regex

        return new RegExp(`[${chars.join("")}]`, "g");
    }

    async renameFromH1(file: TFile, verbose: boolean) {
        const content = await this.app.vault.read(file);

        const match = content.match(/^#\s+(.+)$/m);

        if (!match) {
            if (verbose) {
                const message = `${this.manifest.name} : No h1 found in ${file}.`;
                new Notice(message);
                console.log(message);
            }

            return;
        }

        const rawTitle = match[1] || "";

        // 🧹 Nettoyage caractères
        const regex = this.buildRegex();
        let cleanTitle = rawTitle.replace(regex, " ");

        // 🔤 Normalisation espaces
        cleanTitle = cleanTitle.replace(/\s+/g, " ").trim();

        // 🔁 Substitution des espaces
        this.settings.spaceSubstitute = this.settings.spaceSubstitute || " ";
        cleanTitle = cleanTitle.replace(/ /g, this.settings.spaceSubstitute);

        if (!cleanTitle) {
            if (verbose) {
                const message = `${this.manifest.name} : Something went wrong with the h1 found in ${file}: ${rawTitle}.`;
                new Notice(message);
                console.log(message);
            }

            return;
        }

        let counter = 0;
        let incrementedTitle = cleanTitle;
        let newPath = file.parent && file.parent.path !== '/' ? `${file.parent.path}/${incrementedTitle}.md` : `${incrementedTitle}.md`;


        while (this.app.vault.getFiles().some(file => file.basename === incrementedTitle)) {
            if (file.path === newPath) return;

            counter++;
            incrementedTitle = `${cleanTitle}${this.settings.spaceSubstitute}${counter}`;
            newPath = file.parent && file.parent.path !== '/' ? `${file.parent.path}/${incrementedTitle}.md` : `${incrementedTitle}.md`;
        }

        if (counter > 0)
        {
            cleanTitle = incrementedTitle;

            if (verbose)
            {
                const message = `${this.manifest.name} : New filename already exists for ${file}. Renamed to ${cleanTitle}.`;
                new Notice(message);
                console.log(message);
            }
        }

        try {
            await this.app.fileManager.renameFile(
                file,
                newPath
            );
        } catch (e) {
            const message = `${this.manifest.name} : Something went wrong when renaming ${file} to ${cleanTitle}: ${e}.`;
            new Notice(message);
            console.log(message);
        }
    }

    async renameAllFiles() {
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            if (this.isIgnored(file)) continue;

            await this.renameFromH1(file, true);

            await new Promise(r => setTimeout(r, 10)); // évite freeze UI
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.createDebounce(); // 🔁 appliquer nouveau délai
    }
}
