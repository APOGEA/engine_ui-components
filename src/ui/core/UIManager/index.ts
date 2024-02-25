import { Grid } from "../../components/Grid";
import { ToolbarSection } from "../../components/ToolbarSection";
import { Panel } from "../../components/Panel";
import { PanelsContainer } from "../../components/PanelsContainer";
import { Toolbar } from "../../components/Toolbar";
import { styles } from "./src/styles";
import { ToolbarsContainer } from "../../components/ToolbarsContainer";

export interface ManagerConfig {
  addGlobalStyles: boolean,
  onViewportResize: () => void;
}

type Areas = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

export type UIOrientation = "horizontal" | "vertical";

export class UIManager<GridAreas extends string = Areas> {
  private PANEL_CONTAINER_PREFIX = "panel-"
  private GRID_TOOLBAR_PREFIX = "toolbar-"

  private containers: {
    panels: PanelsContainer[]
    toolbars: ToolbarsContainer[]
  } = { panels: [], toolbars: [] }
  
  // The main working area of the app.
  viewport: HTMLElement

  // The HTMLElement surrounding the viewport.
  outerGrid = document.createElement("bim-grid") as Grid

  // The HTMLElement inside the viewport.
  innerGrid = document.createElement("bim-grid") as Grid

  // A configuration object to define the UI behavior.
  config: Required<ManagerConfig> = {
    addGlobalStyles: true,
    onViewportResize: () => {}
  }

  constructor(viewport: HTMLElement, config?: Partial<ManagerConfig>) {
    this.viewport = viewport
    this.config = { ...this.config, ...config }
    this.createGrid()
    this.createPanelContainers()
    this.createGridToolbars()
    this.addGlobalStyles()
  }

  private addGlobalStyles() {
    const style = document.createElement("style")
    const firstChild = document.head.firstChild
    if (firstChild) {
      document.head.insertBefore(style, firstChild)
    } else {
      document.head.append(style)
    }
    style.id = "bim-ui"
    style.textContent = styles.globalStyles.cssText
  }

  private validateGridTemplates() {
    // Outer must have viewport
    // Inner must not have viewport
    // There must be no repeated panels/toolbars
    // 
  }

  private createGrid() {
    const { onViewportResize } = this.config
    const container = this.viewport.parentElement
    if (!container) {
      throw new Error("UIManager: viewport needs to have a parent to create a grid.")
    }
    container.append(this.outerGrid)
    container.style.overflow = "auto"
    this.outerGrid.append(this.viewport)
    this.outerGrid.floating = false
    this.innerGrid.floating = true
    this.viewport.style.position = "relative"
    this.viewport.style.minHeight = "0px";
    this.viewport.style.minWidth = "0px";
    this.viewport.style.gridArea = "viewport";
    this.viewport.append(this.innerGrid)
    const observer = new ResizeObserver(onViewportResize)
    observer.observe(this.viewport)
  }

  private getGridRows(grid: Grid) {
    const template = getComputedStyle(grid).getPropertyValue("--bim-grid--tpl")
    const rows = template
      .trim()
      .split(/"([^"]*)"/)
      .map((value, index) => {if (index % 2 !== 0) {return value}})
      .filter((value) => value !== undefined) as string[];
    return rows
  }
  
  private createPanelContainers() {
    // Request animation frame is needed because in the first render of the page
    // the browser has not computed CSS variables yet.
    requestAnimationFrame(() => {
      const { panels: panelContainers } = this.containers
      for (const grid of [this.outerGrid, this.innerGrid]) {
        const rows = this.getGridRows(grid)
        for (const [rowIndex, row] of rows.entries()) {
          const columns = row.trim().split(/\s+/);
          for (const column of columns) {
            const isPanelContainer = RegExp(/\b\w*panel-\b/g).test(column);
            if (!isPanelContainer) continue;
            const columnArea = column.split(this.PANEL_CONTAINER_PREFIX)[1] as GridAreas
            const existingContainer = panelContainers.find((container) => container.gridArea === columnArea)
            if (existingContainer) {
              grid.append(existingContainer);
              continue
            };
            const abovePanel = rowIndex > 0 && rows[rowIndex - 1].includes(column);
            const belowPanel = rowIndex < rows.length - 1 && rows[rowIndex + 1].includes(column);
            const element = document.createElement("bim-panels-container") as PanelsContainer
            panelContainers.push(element)
            element.horizontal = !(abovePanel || belowPanel)
            element.gridArea = columnArea
            grid.append(element);
          }
        }
      }
      this.removeUnusedLayoutElements()
    })
  }

  private removeUnusedLayoutElements() {
    const { panels: panelContainers } = this.containers
    const usedAreas = [
      ...this.getGridRows(this.outerGrid),
      ...this.getGridRows(this.innerGrid)
    ]
    for (const container of panelContainers) {
      const area = `${this.PANEL_CONTAINER_PREFIX}${container.gridArea}`
      const used = usedAreas.find((usedArea) => usedArea.includes(area))
      if (!used) container.remove()
    }
  }

  private createGridToolbars() {
    // Request animation frame is needed because in the first render of the page
    // the browser has not computed CSS variables yet.
    requestAnimationFrame(() => {
      const { toolbars } = this.containers
      for (const grid of [this.outerGrid, this.innerGrid]) {
        const rows = this.getGridRows(grid)
        for (const [rowIndex, row] of rows.entries()) {
          const columns = row.trim().split(/\s+/);
          for (const column of columns) {
            const isToolbar = RegExp(/\b\w*toolbar-\b/g).test(column);
            if (!isToolbar) continue;
            const columnArea = column.split(this.GRID_TOOLBAR_PREFIX)[1] as GridAreas
            const existingContainer = toolbars.find((container) => container.gridArea === columnArea)
            if (existingContainer) {
              grid.append(existingContainer);
              continue
            };
            const abovePanel = rowIndex > 0 && rows[rowIndex - 1].includes(column);
            const belowPanel = rowIndex < rows.length - 1 && rows[rowIndex + 1].includes(column);
            const element = document.createElement("bim-toolbars-container") as ToolbarsContainer
            toolbars.push(element)
            element.horizontal = !(abovePanel || belowPanel)
            element.gridArea = columnArea
            grid.append(element);
          }
        }
      }
      this.removeUnusedLayoutElements()
    })
  }

  private getPanelsContainer(area: GridAreas) {
    const { panels: panelContainers } = this.containers
    const container = panelContainers.find((container) => container.gridArea === area)
    if (!container) {
      throw new Error(`UIManager: ${this.PANEL_CONTAINER_PREFIX}${area} wasn't define in --bim-grid--tpl`)
    }
    return container
  }

  private getGridToolbar(area: GridAreas) {
    const { toolbars } = this.containers
    const container = toolbars.find((container) => container.gridArea === area)
    if (!container) {
      throw new Error(`UIManager: ${this.GRID_TOOLBAR_PREFIX}${area} wasn't define in --bim-grid--tpl`)
    }
    return container
  }


  dispose() {
    this.innerGrid.remove()
    const outerGridParent = this.outerGrid.parentNode
    if (outerGridParent) {
      outerGridParent.append(this.viewport)
    }
    this.outerGrid.remove()
  }

  addPanel(panel: Panel, area: GridAreas) {
    requestAnimationFrame(() => {
      const container = this.getPanelsContainer(area)
      container.appendChild(panel)
    })
  }

  addToolbar(section: Toolbar, area: GridAreas) {
    requestAnimationFrame(() => {
      const container = this.getGridToolbar(area)
      container.appendChild(section)
    })
  }

  createElementFromTemplate<T extends HTMLElement = HTMLElement>(template: string) {
    const temp = document.createElement("div");
    temp.innerHTML = template;
    const element = temp.firstElementChild as T;
    temp.remove();
    return element;
  }

  setGridTemplate(grid: "outer" | "inner", template: string) {
    const element = grid === "inner" ? this.innerGrid : this.outerGrid
    const style = getComputedStyle(element)
    if (style.getPropertyValue('--bim-grid--tpl')) {
      element.style.setProperty('--bim-grid--tpl', template);
    }
    this.createPanelContainers()
  }
}