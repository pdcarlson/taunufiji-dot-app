import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Combobox from "./Combobox";

describe("Combobox", () => {
  it("does not show create for normalized existing values", () => {
    render(
      <Combobox
        label="Professor"
        value=""
        options={["Cutler"]}
        onChange={vi.fn()}
        onCreate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /select/i }));
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "  cutler  " },
    });

    expect(screen.queryByRole("button", { name: /create/i })).toBeNull();
  });

  it("trims created values before create/change callbacks", async () => {
    const onChange = vi.fn();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <Combobox
        label="Professor"
        value=""
        options={[]}
        onChange={onChange}
        onCreate={onCreate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /select/i }));
    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "  New Professor  " },
    });

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith("New Professor");
      expect(onChange).toHaveBeenCalledWith("New Professor");
    });
  });
});
