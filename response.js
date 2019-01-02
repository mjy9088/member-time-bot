/*
 * 카카오톡 봇 - 독립형 - 멤버시
 *
 * 사용 / 수정 / 배포 전에 아래 주소의 글을 읽어보세요!
 * https://gitlab.com/mjy-hobby/kakaotalk-bot/standalone/member-clock
 */

let bmc_rooms = {};

function bmc_register(room, scr)
{
	if(!bmc_rooms[room]) bmc_rooms[room] = [];
	bmc_rooms[room].push(scr);
}

function memberClock(member_list, session)
{
	const now = new Date();
	let n = ((now.getHours() + 11) % 12 + 1) * 60 + now.getMinutes();
	for(let i = 0; i <= member_list.length; i++)
	{
		let m = member_list[i % member_list.length][3];
		if(i == member_list.length || n < m)
		{
			let tmp = [member_list[i % member_list.length][0]];
			for(let j = (i % member_list.length) + 1; j < member_list.length; j++)
			{
				if(m == member_list[j][3])
				{
				tmp.push(member_list[j][0]);
				}
				else break;
			}
			m -= n;
			if(i == member_list.length) m += 720;
			if(now.getSeconds() != 0)
			{
				m -= 1;
			}
			i %= member_list.length;
			session.reply(tmp.join("시, ") + "시(" + member_list[i][1] + "시 " + member_list[i][2] + "분)까지 약 " +
				(m > 60 ? (Math.floor(m / 60) + "시간 " + (m % 60)) : m) + "분 " + ((60 - now.getSeconds()) % 60) + "초 남았습니다.");
			return true;
		}
	}
}

function list_members(member_list, session)
{
	let ret = "";
	for(let i = 0; i < member_list.length; i++)
	{
		if(i) ret += "\n";
		ret += member_list[i][0] + "시는 " + member_list[i][1] + "시 " + member_list[i][2] + "분입니다.";
	}
	session.reply(ret);
	return true;
}

function getFunction(prefix, member_list)
{
	return function (msg, session)
	{
		let tmp = msg.trim().split(" ");
		if(tmp[0] == prefix + "멤버시")
		{
			if(tmp.length >= 2 && tmp[1] == "목록") return list_members(member_list, session);
			return memberClock(member_list, session);
		}
		if(tmp[0] == prefix + "정보")
		{
			session.reply("독립형 멤버시 봇입니다.\n자세한 정보는 https://gitlab.com/mjy-hobby/kakaotalk-bot/standalone/member-clock 에서 확인하실 수 있습니다.");
			return true;
		}
	};
}

function response(room, msg, sender, isGroupChat, replier, imageDB)
{
	room = room.trim();
	if(bmc_rooms[room])
	{
		for(var i = 0; i < bmc_rooms[room].length; i++)
		{
			if(bmc_rooms[room][i](msg, replier))
			{
				return;
			}
		}
	}
}

function readMemberInfo()
{
	let br = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(
		android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/kbot/members.txt"))), tmp, ret = {};
	while((tmp = br.readLine()) != null)
	{
		if((tmp = tmp.trim()) == "") continue;
		if(ret[tmp])
		{
			Log.w("그룹 " + tmp + "이(가) 이미 있습니다. 덮어씁니다.");
		}
		let group = tmp;
		ret[group] = [];
		while((tmp = br.readLine()) != null && (tmp = tmp.trim()) != "")
		{
			tmp = tmp.split("/");
			tmp = [tmp[0], parseInt(tmp[1]), parseInt(tmp[2])];
			if(isNaN(tmp[1]) || isNaN(tmp[2]) || tmp[1] < 1 || tmp[1] > 12 || tmp[2] < 0 || tmp[2] > 59)
			{
				Log.e("멤버 " + tmp[0] + "의 데이터가 잘못되었습니다.");
				continue;
			}
			ret[group].push(tmp);
		}
	}
	br.close();
	return ret;
}

function readRoomInfo(memberInfo)
{
	let br = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(
		android.os.Environment.getExternalStorageDirectory().getAbsolutePath() + "/kbot/rooms.txt"))), tmp, ret = [];
	while((tmp = br.readLine()) != null)
	{
		if((tmp = tmp.trim()) == "") continue;
		tmp = tmp.split("/");
		let temp = [];
		for(let i = 2; i < tmp.length; i++)
		{
			if(!memberInfo[tmp[i]])
			{
				Log.w("방 " + tmp[0] + "에 적용할 그룹 " + tmp[i] + "를 찾지 못했습니다.");
				continue;
			}
			temp.push(tmp[i]);
		}
		ret.push([tmp[0], tmp[1], temp]);
	}
	br.close();
	return ret;
}

(function ()
{
	let members = readMemberInfo();
	const room = readRoomInfo(members);

	for(var i in members.length)
	{
		if(!members.hasOwnProperty(i)) continue;
		for(let j = 0; j < members[i].length; j++)
		{
			members[i][j].push(members[i][j][1] * 60 + members[i][j][2]);
		}
	}

	let tmp = {};

	for(let i = 0; i < room.length; i++)
	{
		if(!room[i][2]) continue;
		let key = room[i][2].sort().join("/");
		if(!tmp[key])
		{
			let temp = [];
			for(let j = 0; j < room[i][2].length; j++)
			{
				temp = temp.concat(members[room[i][2][j]]);
			}
			tmp[key] = temp.sort((a, b) => a[3] - b[3]);
		}
		bmc_register(room[i][0], getFunction(room[i][1], tmp[key]));
	}
})();
