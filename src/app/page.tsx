import EventList from "@/components/EventList";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">イベント一覧</h2>
          <p className="text-gray-500 text-sm mt-1">
            作成した日程調整イベントを管理できます
          </p>
        </div>
        <a
          href="/create"
          className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition text-sm whitespace-nowrap"
        >
          + 新規作成
        </a>
      </div>

      <EventList />
    </div>
  );
}
