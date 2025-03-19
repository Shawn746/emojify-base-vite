"use client";
import { get, sampleSize, isEmpty } from "lodash-es";
import {
  bitable,
  ITableMeta,
  IViewMeta,
  IFieldMeta,
  ITable,
  ToastType,
} from "@lark-base-open/js-sdk";
import {
  Popover,
  Card,
  Button,
  Form,
  Radio,
  Typography,
  Tag,
  Notification,
  Spin,
} from "@douyinfe/semi-ui";
import { IconInfoCircle } from "@douyinfe/semi-icons";
import { useState, useEffect, useRef } from "react";
import { BaseFormApi } from "@douyinfe/semi-foundation/lib/es/form/interface";
import { formatJsonString, handleDoubao } from "./request";
import { allEmoji } from "./allEmoji";
import "./App.css";


interface EmojiData {
  id: string;
  emojis: string[];
  selectedIndex: number;
}

interface TargetData {
  table: ITableMeta[];
  view: IViewMeta[];
  field: IFieldMeta[];
}

interface TargetEmojiData {
  table: EmojiData[];
  view: EmojiData[];
  field: EmojiData[];
}

const EmojiCard = ({
  data,
  originalName,
  position,
  onEmojiSelect,
  onApply,
}: any) => {
  const emojis = get(data, "emojis");
  const generateCardTitle = () => {
    console.log(data, "qxx data");
    if (!isEmpty(data)) {
      const emoji = emojis[data.selectedIndex];
      if (emoji) {
        return position === "prefix"
          ? `${emoji} ${originalName}`
          : `${originalName} ${emoji}`;
      }
      return originalName;
    }
    return originalName;
  };

  return (
    <Card
      shadows="hover"
      title={
        <span style={{ fontSize: 14, fontWeight: 400 }}>
          {generateCardTitle()}
        </span>
      }
      style={{ marginBottom: 8 }}
      headerStyle={{ padding: 12 }}
      bodyStyle={{ padding: 12, display: !isEmpty(emojis) ? "block" : "none" }}
      headerExtraContent={
        !isEmpty(emojis) ? (
          <div>
            <Typography.Text
              link
              onClick={onApply}
              className={"link-text"}
            >
              📌 应用
            </Typography.Text>
          </div>
        ) : null
      }
    >
      {data.emojis.map((e: string, i: number) => (
        <Tag
          key={i}
          color={i === data.selectedIndex ? "light-blue" : "grey"}
          onClick={() => onEmojiSelect(i)}
          style={{ marginRight: 8 }}
        >
          {e}
        </Tag>
      ))}
    </Card>
  );
};

export default function App() {
  const [targetData, setTargetData] = useState<TargetData>({
    table: [],
    view: [],
    field: [],
  });
  const [targetEmojiData, setTargetEmojiData] = useState<TargetEmojiData>({
    table: [],
    view: [],
    field: [],
  });
  const [activeTable, setActiveTable] = useState<ITableMeta>();
  const [position, setPosition] = useState<"prefix" | "suffix">("prefix");
  const [mode, setMode] = useState<"ai" | "random">("ai");
  const [target, setTarget] = useState<"table" | "view" | "field">("table");
  const [loading, setLoading] = useState(false);
  const [targetLoading, setTargetLoading] = useState(false);
  const [selectedTableInstance, setSelectedTableInstance] = useState<ITable>();
  const formApi = useRef<BaseFormApi>();

  // 模拟批量调用AI生成Emoji
  const batchGenerateEmojis = async (names: string[]) => {
    const prompts = names.map((name) => `名称："${name}"`).join("\n");

    try {
      const doubaoRes = await handleDoubao(prompts);
      const targetResultJsonString = doubaoRes.choices[0].message.content;
      const finalResult = formatJsonString(targetResultJsonString);
      return finalResult;
    } catch (error) {
      // Notification.error({ content: "服务调用失败" });
      await bitable.ui.showToast({
        toastType: ToastType.error,
        message: "服务调用失败",
      });
    }
  };

  // 从 allEmoji 对象中随机获取 emoji
  const getRandomEmojis = () => {
    // 把所有分类中的 emoji 提取到一个数组中
    const allEmojiList = Object.values(allEmoji).flatMap((category) =>
      category.map((item) => item.emoji)
    );
    return sampleSize(allEmojiList, 8);
  };

  // 美化所有目标
  const handleEmojify = async () => {
    setLoading(true);
    const currentData = targetData[target];
    const names = currentData.map((item) => item.name!);
    let emojisLists: string[][] = [];

    if (mode === "ai") {
      emojisLists = await batchGenerateEmojis(names);
    } else if (mode === "random") {
      emojisLists = names.map(() => getRandomEmojis());
    }

    const results = currentData.map((item, index) => ({
      id: item.id!,
      emojis: emojisLists?.[index] ?? emojisLists[0],
      selectedIndex: 0,
    }));

    setTargetEmojiData((prev) => ({
      ...prev,
      [target]: results,
    }));
    setLoading(false);
  };

  // 应用单个目标
  const applyToTarget = async (id: string, noEmit: boolean = false) => {
    const currentData = targetData[target];
    const originalName = currentData.find((t) => t.id === id)?.name || "";
    const emojiData = targetEmojiData[target].find((d) => d.id === id);
    if (!emojiData) return;

    const newName = () => {
      const emoji = emojiData.emojis[emojiData.selectedIndex];
      return position === "prefix"
        ? `${emoji} ${originalName}`
        : `${originalName} ${emoji}`;
    };

    try {
      if (target === "table") {
        await bitable.base.setTable(id, { name: newName() });
      } else if (target === "view") {
        await selectedTableInstance?.setView(id, { name: newName() });
      } else if (target === "field") {
        await selectedTableInstance?.setField(id, { name: newName() });
      }
      if (!noEmit) {
        await bitable.ui.showToast({
          toastType: ToastType.success,
          message: "更新成功",
        });
      }
    } catch (error) {
      await bitable.ui.showToast({
        toastType: ToastType.error,
        message: "更新失败",
      });
    }
  };

  // 应用全部
  const applyAll = async () => {
    const currentEmojiData = targetEmojiData[target];
    for (const data of currentEmojiData) {
      await applyToTarget(data.id, true);
    }
    await bitable.ui.showToast({
      toastType: ToastType.success,
      message: "更新成功",
    });
  };

  // 点击emoji修改当前选择
  const handleEmojiSelect = (id: string, index: number) => {
    setTargetEmojiData((prev) => ({
      ...prev,
      [target]: prev[target].map((item) => {
        if (item.id === id) {
          return { ...item, selectedIndex: index };
        }
        return item;
      }),
    }));
  };

  useEffect(() => {
    bitable.base
      .getTableMetaList()
      .then((tables) => setTargetData((prev) => ({ ...prev, table: tables })));
    // bitable.base.getActiveTable().then((v) => console.log(v));
  }, []);

  useEffect(() => {
    const updateView = async () => {
      if (selectedTableInstance) {
        setTargetLoading(true);
        const viewMetaList = await selectedTableInstance?.getViewMetaList();
        setTargetData((prev) => ({ ...prev, view: viewMetaList }));
        setTargetLoading(false);
      }
    };
    const updateFiled = async () => {
      if (selectedTableInstance) {
        setTargetLoading(true);
        const fieldMetaList = await selectedTableInstance?.getFieldMetaList();
        setTargetData((prev) => ({ ...prev, field: fieldMetaList }));
        setTargetLoading(false);
      }
    };

    if (target === "view" && selectedTableInstance) {
      updateView();
    } else if (target === "field" && selectedTableInstance) {
      updateFiled();
    }
  }, [target, activeTable, selectedTableInstance]);

  return (
    <main className="main" style={{ padding: "0 12px" }}>
      <Form
        // @ts-ignore
        labelPosition="top"
        getFormApi={(api: BaseFormApi) => (formApi.current = api)}
      >
        <div>
          <div className={"form-field"}>🎯 目标</div>
          <Radio.Group
            type="button"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ marginBottom: 12, marginTop: 12 }}
          >
            <Radio value="table">表格</Radio>
            <Radio value="view">视图</Radio>
            <Radio value="field">字段</Radio>
          </Radio.Group>
        </div>

        {target !== "table" && (
          <>
            <div className={"form-field"}>📊 数据表</div>
            <Form.Select
              field="table"
              // label="数据表"
              noLabel
              placeholder="🏘️ 请先选择数据表"
              className={"form-field"}
              fieldStyle={{ paddingTop: 0 }}
              initValue={selectedTableInstance?.id}
              onChange={async (e) => {
                const tableInstance = await bitable.base.getTable(String(e));
                setSelectedTableInstance(tableInstance);
                // setActiveTable(await tableInstance.getTableMeta());
                if (target === "view") {
                  const viewList = await tableInstance.getViewMetaList();
                  setTargetData((prev) => ({ ...prev, view: viewList }));
                } else if (target === "field") {
                  const fieldMetaList = await tableInstance.getFieldMetaList();
                  setTargetData((prev) => ({ ...prev, field: fieldMetaList }));
                }
              }}
              style={{ width: "100%" }}
            >
              {Array.isArray(targetData.table) &&
                targetData.table.map(({ name, id }) => {
                  return (
                    <Form.Select.Option key={id} value={id}>
                      {name}
                    </Form.Select.Option>
                  );
                })}
            </Form.Select>
          </>
        )}

        <div>
          <div className={"form-field"}>🗂️ 模式</div>
          <Radio.Group
            type="button"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ marginBottom: 12, marginTop: 12 }}
          >
            <Radio value="ai">
              <div style={{ display: 'flex', gap: 4, alignItems: 'center'}}>
                <div>🤖 AI语义</div>
                <div style={{ display: "inline-flex" }}>
                  <Popover
                    position="topLeft"
                    showArrow
                    content={
                      <article style={{ padding: 6 }}>AI根据文本内容匹配，需要等待 ⌛️</article>
                    }
                    // getPopupContainer={() => window.parent.document.body }
                  >
                    <IconInfoCircle
                      style={{ color: "#B6B6B6", fontSize: 14 }}
                    />
                  </Popover>
                </div>
              </div>
            </Radio>
            <Radio value="random">
              <div style={{ display: 'flex', gap: 4, alignItems: 'center'}}>
                <div>✌️ 随性生成</div>
                <div style={{ display: "inline-flex" }}>
                  <Popover
                    position="topRight"
                    showArrow
                    content={
                      <article style={{ padding: 6 }}>随机生成，无需等待 🚀</article>
                    }
                  >
                    <IconInfoCircle
                      style={{ color: "#B6B6B6", fontSize: 14 }}
                    />
                  </Popover>
                </div>
              </div>
            </Radio>
          </Radio.Group>
        </div>

        <div className={"form-field"}>📌 位置</div>
        <Radio.Group
          type="button"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          style={{ marginBottom: 12, marginTop: 12 }}
        >
          <Radio value="prefix">⏪ 前置</Radio>
          <Radio value="suffix">后置 ⏩</Radio>
        </Radio.Group>

        <Button
          theme="solid"
          loading={loading}
          onClick={handleEmojify}
          style={{
            marginBottom: 12,
            marginRight: 8,
            marginTop: 12,
            display: "block",
          }}
        >
          {"Emojify!!🪄"}
        </Button>

        {!isEmpty(targetData[target]) && (
          <div
            className={"form-field"}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div className={"form-field"}>📽️ 预览</div>
            {!isEmpty(targetEmojiData[target]) && (
              <Typography.Text
                link
                className={"link-text"}
                onClick={applyAll}
              >
                📌📌 应用全部修改
              </Typography.Text>
            )}
          </div>
        )}

        {targetLoading ? (
          <div style={{ position: "relative" }}>
            <Spin />
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            {targetData[target].map((item) => {
              const emojiData = targetEmojiData[target].find(
                (d) => d.id === item.id
              );
              return (
                <EmojiCard
                  key={item.id}
                  data={
                    emojiData || { id: item.id!, emojis: [], selectedIndex: 0 }
                  }
                  originalName={item.name!}
                  position={position}
                  onEmojiSelect={(index: any) =>
                    handleEmojiSelect(item.id!, index)
                  }
                  onApply={() => applyToTarget(item.id!)}
                />
              );
            })}
          </div>
        )}
      </Form>
    </main>
  );
}
