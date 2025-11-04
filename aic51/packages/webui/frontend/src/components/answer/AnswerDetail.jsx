export default function AnswerDetail({ answer }) {
    return (
        <div className="absolute left-96 top-0 bg-blue-200 w-52 p-3">
            <div>
                {/*<div className="">*/}
                {/*    <span className="font-bold">Query ID</span>*/}
                {/*    {": "}*/}
                {/*    {answer.query_id}*/}
                {/*</div>*/}
                <div>
                    <span className="font-bold">Evaluation ID</span>
                    {": "}
                    {answer.query_id}
                </div>
                <div className="">
                    <span className="font-bold">Video ID</span>
                    {": "}
                    {answer.video_id}
                </div>
                <div className="">
                    <span className="font-bold">Frame ID</span>
                    {": "}
                    {answer.frame_id}
                </div>
                <div>
                    <span className="font-bold">Time</span>
                    {": "}
                    {answer.time}
                </div>
                <div className="">
                    <span className="font-bold">Frame Counter</span>
                    {": "}
                    <div className="flex flex-col">
                        {answer.frame_counter.map((e) => (
                            <span key={e}>{e} </span>
                        ))}
                    </div>
                </div>
                <div className="">
                    <span className="font-bold">Answer</span>
                    {": "}
                    {answer.answer}
                </div>
                <div>
                    <span className="font-bold">Result</span>
                    {": "}
                    {answer.correct ? "Correct" : "Wrong"}
                </div>
                <div>
                    <span className="font-bold">Submitted at</span>
                    {": "}
                    {answer.submitted}
                </div>
            </div>
        </div>
    );
}