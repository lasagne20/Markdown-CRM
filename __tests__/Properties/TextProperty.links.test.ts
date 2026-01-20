import { TextProperty } from "../../src/properties/TextProperty";
import { Vault } from "../../src/vault/Vault";
import { Classe } from "../../src/vault/Classe";

describe("TextProperty - Link Rendering with Aliases", () => {
    let vault: Vault;
    let targetClasse: Classe;

    beforeEach(() => {
        // Create a mock vault
        vault = {
            getFromLink: jest.fn(),
            app: {
                setIcon: jest.fn(),
                sendNotice: jest.fn(),
                open: jest.fn(),
            }
        } as any;
        
        // Create a mock target classe
        targetClasse = {
            getName: () => "TargetFile",
            getPropertyValue: jest.fn(),
            getPath: () => "TargetFile.md",
        } as any;
        
        // Mock vault.getFromLink to track what file is requested
        (vault.getFromLink as jest.Mock).mockImplementation(async (link: string) => {
            if (link === "TargetFile.md" || link === "TargetFile") {
                return targetClasse;
            }
            return null;
        });
    });

    test("should render link without alias correctly", () => {
        const property = new TextProperty("description", vault);

        const value = "Check out [[TargetFile.md]]";
        const display = property.fillDisplay(value, async () => {});

        const link = display.querySelector(".field-textlink");
        expect(link).toBeTruthy();
        expect(link?.innerHTML).toContain("<strong><a href=\"#\" data-path=\"TargetFile.md\">TargetFile.md</a></strong>");
    });

    test("should render link with alias showing alias text", () => {
        const property = new TextProperty("description", vault);

        const value = "Check out [[TargetFile.md|my custom alias]]";
        const display = property.fillDisplay(value, async () => {});

        const link = display.querySelector(".field-textlink");
        expect(link).toBeTruthy();
        expect(link?.innerHTML).toContain("<strong><a href=\"#\" data-path=\"TargetFile.md\">my custom alias</a></strong>");
        expect(link?.innerHTML).not.toContain("TargetFile.md</a>");
        
        // Verify the anchor has the data-path attribute
        const anchor = link?.querySelector("a");
        expect(anchor?.getAttribute("data-path")).toBe("TargetFile.md");
        expect(anchor?.textContent).toBe("my custom alias");
    });

    test("should navigate to correct file when clicking link with alias", async () => {
        const property = new TextProperty("description", vault);

        const value = "Check out [[TargetFile.md|my custom alias]]";
        const display = property.fillDisplay(value, async () => {});

        const anchor = display.querySelector("a");
        expect(anchor).toBeTruthy();
        expect(anchor?.textContent).toBe("my custom alias");

        // Simulate clicking the link
        const clickEvent = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(clickEvent, "target", {
            value: anchor,
            enumerable: true,
        });

        await anchor?.onclick?.(clickEvent as any);

        // Should call getFromLink with the actual file path, not the alias
        expect(vault.getFromLink).toHaveBeenCalledWith("TargetFile.md");
        expect(vault.getFromLink).not.toHaveBeenCalledWith("my custom alias");
    });

    test("should handle multiple links with different aliases", () => {
        const property = new TextProperty("description", vault);

        const value = "See [[File1.md|First]] and [[File2.md|Second]]";
        const display = property.fillDisplay(value, async () => {});

        const link = display.querySelector(".field-textlink");
        expect(link).toBeTruthy();
        
        const anchors = display.querySelectorAll("a");
        expect(anchors.length).toBe(2);
        expect(anchors[0].textContent).toBe("First");
        expect(anchors[1].textContent).toBe("Second");
    });

    test("should handle link with pipe but empty alias", () => {
        const property = new TextProperty("description", vault);

        const value = "Check out [[TargetFile.md|]]";
        const display = property.fillDisplay(value, async () => {});

        const link = display.querySelector(".field-textlink");
        expect(link).toBeTruthy();
        // Should fallback to showing the path when alias is empty
        expect(link?.innerHTML).toContain("TargetFile.md");
    });

    test("should preserve text before and after links", () => {
        const property = new TextProperty("description", vault);

        const value = "Before [[File.md|alias]] after";
        const display = property.fillDisplay(value, async () => {});

        const link = display.querySelector(".field-textlink");
        expect(link?.textContent).toContain("Before");
        expect(link?.textContent).toContain("alias");
        expect(link?.textContent).toContain("after");
    });
});
