export function useAccountStatusGate() {
  const check = async (
    customerId?: string,
    customerStatus?: string,
    action?: string
  ): Promise<boolean> => {
    return true;
  };

  const modal = null;

  return { check, modal };
}
