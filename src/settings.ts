import {App, PluginSettingTab, Setting} from "obsidian";
import H1FilenameSync from "./main";

export interface PluginSettings {
    invalidChars: string;
    spaceSubstitute: string;
    ignoredFolders: string;
    delay: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    invalidChars: '/,\\,?,%,*,:,|,",<,>,.,·',
    spaceSubstitute: " ",
    ignoredFolders: "fichiers",
    delay: 1000
};

export class H1SettingTab extends PluginSettingTab {
    plugin: H1FilenameSync;

    constructor(app: App, plugin: H1FilenameSync) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("Illegal characters")
            .setDesc("Characters to strip from the heading when generating the filename, separated by commas.")
            .addText(text =>
                text
                    .setPlaceholder("/,\\,?,...")
                    .setValue(this.plugin.settings.invalidChars)
                    .onChange(async (value) => {
                        this.plugin.settings.invalidChars = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Space replacement")
            .setDesc("Replace spaces with this character when generating the filename.")
            .addText(text =>
                text
                    .setValue(this.plugin.settings.spaceSubstitute)
                    .onChange(async (value) => {
                        this.plugin.settings.spaceSubstitute = value || " ";
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Excluded folders")
            .setDesc("List of folders that this plugin will ignore, separated by commas.")
            .addText(text =>
                text
                    .setValue(this.plugin.settings.ignoredFolders)
                    .onChange(async (value) => {
                        this.plugin.settings.ignoredFolders = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Update delay")
            .setDesc("Delay in milliseconds before renaming the file after typing stops. This prevents frequent renames while typing.")
            .addText(text =>
                text
                    .setValue(String(this.plugin.settings.delay))
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (!isNaN(num)) {
                            this.plugin.settings.delay = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        new Setting(containerEl)
            .setName("Apply to all notes")
            .setDesc("Renames all the files according to their H1. Excluded folders will be ignored.")
            .addButton(button =>
                button
                    .setButtonText("Apply to all")
                    .setCta()
                    .onClick(async () => {
                        button.setDisabled(true);
                        button.setButtonText("Renaming...");

                        await this.plugin.renameAllFiles();

                        button.setButtonText("Done!");
                        setTimeout(() => {
                            button.setButtonText("Apply to all");
                            button.setDisabled(false);
                        }, 1500);
                    })
            );
    }
}