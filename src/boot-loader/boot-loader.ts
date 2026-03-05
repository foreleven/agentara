/**
 * The BootLoader is the main entry point for the agentara application
 */
class BootLoader {
  /**
   * Bootstraps the application by verifying the integrity and then igniting the kernel.
   */
  public async bootstrap(): Promise<void> {
    await this._verifyIntegrity();
    await this._igniteKernel();
  }

  private async _verifyIntegrity(): Promise<void> {
    // TODO:
    // Checking if the `$AGENTARA_HOME` directory exists
    // - If not, create it, and copy everything from `./user-home` to `$AGENTARA_HOME`
    // - Initialize `config.yaml` with the default values
  }

  private async _igniteKernel(): Promise<void> {
    const { default: Kernel } = await import("@/kernel");
    await Kernel.__internalInitialize();
  }
}

export const bootLoader = new BootLoader();
